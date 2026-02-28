"""Unit tests for Pydantic schema validators: physical range limits on Create/Update schemas."""

import uuid

import pytest
from pydantic import ValidationError

from app.schemas.powder import PowderCreate, PowderResponse, PowderUpdate
from app.schemas.bullet import BulletCreate, BulletUpdate
from app.schemas.cartridge import CartridgeCreate, CartridgeUpdate
from app.schemas.rifle import RifleCreate, RifleUpdate
from app.schemas.load import LoadCreate, LoadUpdate
from app.schemas.simulation import DirectSimulationRequest, LadderTestRequest, ParametricSearchRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_UUID = uuid.uuid4()


def valid_powder_data():
    return dict(
        name="Varget",
        manufacturer="Hodgdon",
        burn_rate_relative=50.0,
        force_constant_j_kg=950_000,
        covolume_m3_kg=0.001,
        flame_temp_k=3500.0,
        gamma=1.24,
        density_g_cm3=0.92,
        burn_rate_coeff=1.6e-8,
        burn_rate_exp=0.86,
    )


def valid_bullet_data():
    return dict(
        name="SMK 168gr",
        manufacturer="Sierra",
        weight_grains=168.0,
        diameter_mm=7.82,
        length_mm=31.0,
        bc_g1=0.462,
        sectional_density=0.248,
    )


def valid_cartridge_data():
    return dict(
        name=".308 Winchester",
        saami_max_pressure_psi=62_000,
        case_capacity_grains_h2o=56.0,
        case_length_mm=51.18,
        overall_length_mm=71.12,
        bore_diameter_mm=7.62,
        groove_diameter_mm=7.82,
    )


def valid_rifle_data():
    return dict(
        name="Remington 700",
        barrel_length_mm=610.0,
        twist_rate_mm=254.0,
        cartridge_id=VALID_UUID,
        chamber_volume_mm3=4500.0,
    )


def valid_load_data():
    return dict(
        name="Match Load 1",
        powder_id=VALID_UUID,
        bullet_id=VALID_UUID,
        rifle_id=VALID_UUID,
        powder_charge_grains=44.0,
        coal_mm=71.0,
        seating_depth_mm=8.0,
    )


# ---------------------------------------------------------------------------
# PowderCreate / PowderUpdate
# ---------------------------------------------------------------------------


class TestPowderValidation:
    """Validate physical range constraints on PowderCreate."""

    def test_valid_powder_passes(self):
        p = PowderCreate(**valid_powder_data())
        assert p.name == "Varget"

    def test_force_constant_too_high(self):
        data = valid_powder_data()
        data["force_constant_j_kg"] = 3_000_000  # > 2M limit
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_gamma_below_minimum(self):
        data = valid_powder_data()
        data["gamma"] = 0.5  # must be > 1.0
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_gamma_above_maximum(self):
        data = valid_powder_data()
        data["gamma"] = 2.5  # must be <= 2.0
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_flame_temp_too_high(self):
        data = valid_powder_data()
        data["flame_temp_k"] = 7000  # > 6000 K limit
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_density_too_high(self):
        data = valid_powder_data()
        data["density_g_cm3"] = 5.0  # > 3.0 limit
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_empty_name_rejected(self):
        data = valid_powder_data()
        data["name"] = ""
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_update_partial_validates(self):
        """PowderUpdate with a single invalid field should fail."""
        with pytest.raises(ValidationError):
            PowderUpdate(gamma=0.5)

    def test_burn_rate_exp_too_high(self):
        data = valid_powder_data()
        data["burn_rate_exp"] = 3.0  # > 2.0 limit
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_powder_create_3curve_fields_optional(self):
        """PowderCreate without 3-curve fields is valid."""
        p = PowderCreate(**valid_powder_data())
        assert p.ba is None
        assert p.bp is None
        assert p.br is None
        assert p.brp is None
        assert p.z1 is None
        assert p.z2 is None
        assert p.a0 is None

    def test_powder_create_3curve_fields_valid(self):
        """PowderCreate with all 7 GRT fields passes validation."""
        data = valid_powder_data()
        data.update(ba=1.5, bp=0.3, br=0.2, brp=0.1, z1=0.30, z2=0.70, a0=5.0)
        p = PowderCreate(**data)
        assert p.ba == 1.5
        assert p.bp == 0.3
        assert p.br == 0.2
        assert p.brp == 0.1
        assert p.z1 == 0.30
        assert p.z2 == 0.70
        assert p.a0 == 5.0

    def test_powder_create_z1_z2_bounds(self):
        """z1 and z2 outside [0.01, 0.99] rejected."""
        data = valid_powder_data()
        data["z1"] = 0.0  # below 0.01
        with pytest.raises(ValidationError):
            PowderCreate(**data)

        data = valid_powder_data()
        data["z2"] = 1.0  # above 0.99
        with pytest.raises(ValidationError):
            PowderCreate(**data)

    def test_powder_response_has_3curve_true(self):
        """PowderResponse with all 6 core fields set has has_3curve=True."""
        resp = PowderResponse(
            id=VALID_UUID,
            **valid_powder_data(),
            ba=1.5, bp=0.3, br=0.2, brp=0.1, z1=0.30, z2=0.70, a0=5.0,
        )
        assert resp.has_3curve is True

    def test_powder_response_has_3curve_false(self):
        """PowderResponse with missing fields has has_3curve=False."""
        # No 3-curve fields
        resp = PowderResponse(
            id=VALID_UUID,
            **valid_powder_data(),
        )
        assert resp.has_3curve is False

        # Partial (only ba and bp set)
        resp2 = PowderResponse(
            id=VALID_UUID,
            **valid_powder_data(),
            ba=1.5, bp=0.3,
        )
        assert resp2.has_3curve is False


# ---------------------------------------------------------------------------
# BulletCreate
# ---------------------------------------------------------------------------


class TestBulletValidation:
    def test_valid_bullet_passes(self):
        b = BulletCreate(**valid_bullet_data())
        assert b.weight_grains == 168.0

    def test_weight_too_high(self):
        data = valid_bullet_data()
        data["weight_grains"] = 1500  # > 1000 grains
        with pytest.raises(ValidationError):
            BulletCreate(**data)

    def test_diameter_too_high(self):
        data = valid_bullet_data()
        data["diameter_mm"] = 25.0  # > 20 mm
        with pytest.raises(ValidationError):
            BulletCreate(**data)

    def test_bc_g1_too_high(self):
        data = valid_bullet_data()
        data["bc_g1"] = 3.0  # > 2.0
        with pytest.raises(ValidationError):
            BulletCreate(**data)

    def test_sectional_density_too_high(self):
        data = valid_bullet_data()
        data["sectional_density"] = 1.5  # > 1.0
        with pytest.raises(ValidationError):
            BulletCreate(**data)


# ---------------------------------------------------------------------------
# CartridgeCreate
# ---------------------------------------------------------------------------


class TestCartridgeValidation:
    def test_valid_cartridge_passes(self):
        c = CartridgeCreate(**valid_cartridge_data())
        assert c.saami_max_pressure_psi == 62_000

    def test_pressure_too_high(self):
        data = valid_cartridge_data()
        data["saami_max_pressure_psi"] = 250_000  # > 200k limit
        with pytest.raises(ValidationError):
            CartridgeCreate(**data)

    def test_case_capacity_too_high(self):
        data = valid_cartridge_data()
        data["case_capacity_grains_h2o"] = 600  # > 500 limit
        with pytest.raises(ValidationError):
            CartridgeCreate(**data)

    def test_bore_diameter_too_high(self):
        data = valid_cartridge_data()
        data["bore_diameter_mm"] = 25.0  # > 20 mm
        with pytest.raises(ValidationError):
            CartridgeCreate(**data)


# ---------------------------------------------------------------------------
# RifleCreate
# ---------------------------------------------------------------------------


class TestRifleValidation:
    def test_valid_rifle_passes(self):
        r = RifleCreate(**valid_rifle_data())
        assert r.barrel_length_mm == 610.0

    def test_barrel_length_too_high(self):
        data = valid_rifle_data()
        data["barrel_length_mm"] = 3000  # > 2000 mm
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_round_count_too_high(self):
        data = valid_rifle_data()
        data["round_count"] = 200_000  # > 100k
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_chamber_volume_too_high(self):
        data = valid_rifle_data()
        data["chamber_volume_mm3"] = 60_000  # > 50k
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_rifle_with_chamber_fields_passes(self):
        """RifleCreate with all 3 chamber drawing fields set to valid values."""
        data = valid_rifle_data()
        data.update(freebore_mm=2.0, throat_angle_deg=1.5, headspace_mm=0.1)
        r = RifleCreate(**data)
        assert r.freebore_mm == 2.0
        assert r.throat_angle_deg == 1.5
        assert r.headspace_mm == 0.1

    def test_rifle_freebore_too_large(self):
        """freebore_mm=25 exceeds le=20 limit."""
        data = valid_rifle_data()
        data["freebore_mm"] = 25
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_rifle_throat_angle_too_large(self):
        """throat_angle_deg=15 exceeds le=10 limit."""
        data = valid_rifle_data()
        data["throat_angle_deg"] = 15
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_rifle_headspace_too_large(self):
        """headspace_mm=10 exceeds le=5 limit."""
        data = valid_rifle_data()
        data["headspace_mm"] = 10
        with pytest.raises(ValidationError):
            RifleCreate(**data)

    def test_rifle_chamber_fields_nullable(self):
        """All 3 chamber fields omitted should be valid (default to None)."""
        data = valid_rifle_data()
        r = RifleCreate(**data)
        assert r.freebore_mm is None
        assert r.throat_angle_deg is None
        assert r.headspace_mm is None


# ---------------------------------------------------------------------------
# LoadCreate
# ---------------------------------------------------------------------------


class TestLoadValidation:
    def test_valid_load_passes(self):
        ld = LoadCreate(**valid_load_data())
        assert ld.powder_charge_grains == 44.0

    def test_charge_too_high(self):
        data = valid_load_data()
        data["powder_charge_grains"] = 250  # > 200 grains
        with pytest.raises(ValidationError):
            LoadCreate(**data)

    def test_coal_too_high(self):
        data = valid_load_data()
        data["coal_mm"] = 250  # > 200 mm
        with pytest.raises(ValidationError):
            LoadCreate(**data)

    def test_seating_depth_too_high(self):
        data = valid_load_data()
        data["seating_depth_mm"] = 60  # > 50 mm
        with pytest.raises(ValidationError):
            LoadCreate(**data)

    def test_notes_too_long(self):
        data = valid_load_data()
        data["notes"] = "x" * 1001  # > 1000 chars
        with pytest.raises(ValidationError):
            LoadCreate(**data)


# ---------------------------------------------------------------------------
# Simulation request schemas
# ---------------------------------------------------------------------------


class TestSimulationRequestValidation:
    def test_direct_request_charge_too_high(self):
        with pytest.raises(ValidationError):
            DirectSimulationRequest(
                powder_id=VALID_UUID,
                bullet_id=VALID_UUID,
                rifle_id=VALID_UUID,
                powder_charge_grains=250,
                coal_mm=71.0,
                seating_depth_mm=8.0,
            )

    def test_ladder_step_too_high(self):
        with pytest.raises(ValidationError):
            LadderTestRequest(
                powder_id=VALID_UUID,
                bullet_id=VALID_UUID,
                rifle_id=VALID_UUID,
                coal_mm=71.0,
                seating_depth_mm=8.0,
                charge_start_grains=40.0,
                charge_end_grains=46.0,
                charge_step_grains=3.0,  # > 2.0 limit
            )

    def test_ladder_charge_too_high(self):
        with pytest.raises(ValidationError):
            LadderTestRequest(
                powder_id=VALID_UUID,
                bullet_id=VALID_UUID,
                rifle_id=VALID_UUID,
                coal_mm=71.0,
                seating_depth_mm=8.0,
                charge_start_grains=40.0,
                charge_end_grains=250,  # > 200 limit
                charge_step_grains=0.5,
            )


# ---------------------------------------------------------------------------
# Parametric search request schemas
# ---------------------------------------------------------------------------


class TestParametricSearchRequestValidation:
    def test_valid_request(self):
        req = ParametricSearchRequest(
            rifle_id=VALID_UUID,
            bullet_id=VALID_UUID,
            cartridge_id=VALID_UUID,
            coal_mm=71.0,
        )
        assert req.charge_percent_min == 0.70
        assert req.charge_percent_max == 1.0
        assert req.charge_steps == 5

    def test_missing_required_fields(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                # missing bullet_id and cartridge_id
                coal_mm=71.0,
            )

    def test_charge_percent_min_too_high(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                bullet_id=VALID_UUID,
                cartridge_id=VALID_UUID,
                coal_mm=71.0,
                charge_percent_min=1.5,  # > 1.0
            )

    def test_charge_percent_min_zero(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                bullet_id=VALID_UUID,
                cartridge_id=VALID_UUID,
                coal_mm=71.0,
                charge_percent_min=0.0,  # must be > 0
            )

    def test_charge_steps_too_low(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                bullet_id=VALID_UUID,
                cartridge_id=VALID_UUID,
                coal_mm=71.0,
                charge_steps=1,  # must be >= 2
            )

    def test_charge_steps_too_high(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                bullet_id=VALID_UUID,
                cartridge_id=VALID_UUID,
                coal_mm=71.0,
                charge_steps=25,  # must be <= 20
            )

    def test_coal_too_high(self):
        with pytest.raises(ValidationError):
            ParametricSearchRequest(
                rifle_id=VALID_UUID,
                bullet_id=VALID_UUID,
                cartridge_id=VALID_UUID,
                coal_mm=250,  # > 200
            )


# ---------------------------------------------------------------------------
# Schema Extension Tests (11-01/11-03: SCHM-01 and SCHM-02)
# ---------------------------------------------------------------------------


class TestBulletSchemaExtensions:
    """Tests for bullet schema rendering and velocity-banded BC fields."""

    def test_bullet_schema_new_rendering_fields(self):
        """BulletCreate accepts bearing_surface_mm, boat_tail_length_mm, meplat_diameter_mm, ogive_type."""
        data = valid_bullet_data()
        data.update(
            bearing_surface_mm=18.5,
            boat_tail_length_mm=5.0,
            meplat_diameter_mm=1.8,
            ogive_type="tangent",
        )
        b = BulletCreate(**data)
        assert b.bearing_surface_mm == 18.5
        assert b.boat_tail_length_mm == 5.0
        assert b.meplat_diameter_mm == 1.8
        assert b.ogive_type == "tangent"

    def test_bullet_schema_new_bc_fields(self):
        """BulletCreate accepts bc_g1_high, bc_g1_mid, bc_g1_low, bc_g1_high_vel, bc_g1_mid_vel."""
        data = valid_bullet_data()
        data.update(
            bc_g1_high=0.505,
            bc_g1_mid=0.496,
            bc_g1_low=0.485,
            bc_g1_high_vel=2800,
            bc_g1_mid_vel=1800,
        )
        b = BulletCreate(**data)
        assert b.bc_g1_high == 0.505
        assert b.bc_g1_mid == 0.496
        assert b.bc_g1_low == 0.485
        assert b.bc_g1_high_vel == 2800
        assert b.bc_g1_mid_vel == 1800

    def test_bullet_schema_rejects_invalid_bc(self):
        """bc_g1_high=3.0 (> 2.0 limit) raises ValidationError."""
        data = valid_bullet_data()
        data["bc_g1_high"] = 3.0
        with pytest.raises(ValidationError):
            BulletCreate(**data)

    def test_bullet_schema_rejects_invalid_ogive(self):
        """ogive_type with > 20 chars raises ValidationError."""
        data = valid_bullet_data()
        data["ogive_type"] = "a" * 21  # exceeds max_length=20
        with pytest.raises(ValidationError):
            BulletCreate(**data)


class TestCartridgeSchemaExtensions:
    """Tests for cartridge schema drawing dimension fields."""

    def test_cartridge_schema_new_drawing_fields(self):
        """CartridgeCreate accepts shoulder_angle_deg, neck_length_mm, body_length_mm, rim_thickness_mm, case_type."""
        data = valid_cartridge_data()
        data.update(
            shoulder_angle_deg=20.0,
            neck_length_mm=8.0,
            body_length_mm=39.0,
            rim_thickness_mm=1.5,
            case_type="rimless",
        )
        c = CartridgeCreate(**data)
        assert c.shoulder_angle_deg == 20.0
        assert c.neck_length_mm == 8.0
        assert c.body_length_mm == 39.0
        assert c.rim_thickness_mm == 1.5
        assert c.case_type == "rimless"

    def test_cartridge_schema_rejects_invalid_angle(self):
        """shoulder_angle_deg=100 (> 90 limit) raises ValidationError."""
        data = valid_cartridge_data()
        data["shoulder_angle_deg"] = 100
        with pytest.raises(ValidationError):
            CartridgeCreate(**data)
