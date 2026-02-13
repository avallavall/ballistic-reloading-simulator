# Base de Datos de Materiales Balisticos - Simulador de Precision

## Tabla de Contenidos
1. [Polvoras y Propelentes](#1-polvoras-y-propelentes)
2. [Materiales de Vainas](#2-materiales-de-vainas)
3. [Especificaciones SAAMI/CIP de Presion](#3-especificaciones-saamicip-de-presion)
4. [Coeficientes Balisticos de Proyectiles](#4-coeficientes-balisticos-de-proyectiles)
5. [Friccion de Anima y Recamara](#5-friccion-de-anima-y-recamara)
6. [Fuentes y Referencias](#6-fuentes-y-referencias)

---

## 1. Polvoras y Propelentes

### 1.1 Propiedades Termoquimicas Generales por Tipo de Propelente

Los valores de constante de fuerza (impetus), covolumen y temperatura de llama dependen de la
composicion quimica del propelente. Los propelentes comerciales para armas pequenas se clasifican en:

| Propiedad | Base Simple (NC) | Base Doble (NC+NG) | Base Triple (NC+NG+NQ) |
|-----------|-------------------|---------------------|--------------------------|
| Constante de Fuerza F (kJ/kg) | 900 - 1000 | 1000 - 1200 | 1050 - 1280 |
| Covolumen eta (cm3/g) | 0.95 - 1.05 | 0.95 - 1.10 | 0.90 - 1.05 |
| Temp. Adiab. Llama (K) | 2500 - 3200 | 3000 - 3800 | 2800 - 3500 |
| Ratio Calores Especificos gamma | 1.22 - 1.26 | 1.20 - 1.24 | 1.21 - 1.25 |
| Densidad gravimetrica (g/cm3) | 1.55 - 1.64 | 1.55 - 1.66 | 1.58 - 1.65 |

**Nota**: NC = Nitrocelulosa, NG = Nitroglicerina, NQ = Nitroguanidina.
Los valores tipicos de referencia para uso en simulacion de balistica interior son:
- F ~ 950 kJ/kg, eta ~ 1.0 cm3/g, gamma ~ 1.24 para base simple tipica (IMR, Hodgdon Extreme)
- F ~ 1100 kJ/kg, eta ~ 1.0 cm3/g, gamma ~ 1.22 para base doble tipica (Vihtavuori N500 serie)

**Fuentes**: AMCP 706-175 Engineering Design Handbook; DTIC ADA590866 "Thermodynamics of Interior Ballistics"; ResearchGate "On The Definition of Propellant Force"; PMC NIH "Mechanical Properties of Gun Propellants"; GB2326875A Patent (force constant 1060-1210 kJ/kg para triple base).

### 1.2 Tabla de Polvoras Comunes con Propiedades

La siguiente tabla incluye polvoras comunes usadas en recarga de rifle, con sus propiedades
estimadas para uso en simulacion de balistica interior. Los valores de temperatura de llama provienen
de la base de datos de QuickLOAD y foros de balistica; los de burn rate son relativos (1=mas rapido).

| # | Nombre | Fabricante | Tipo | Burn Rate Relativo | Temp. Llama (K) | Densidad Bulk (g/cm3) | Uso Tipico |
|---|--------|-----------|------|-------------------|-----------------|----------------------|------------|
| 1 | Hodgdon H110 | Hodgdon | Esferica, DB | Muy Rapido (pistola/revolver) | ~3400 | 0.88 | .357 Mag, .44 Mag |
| 2 | IMR 4198 | IMR/Hodgdon | Extruida, SB | Rapido (52) | ~3860 | 0.82 | .222 Rem, .223 Rem |
| 3 | Hodgdon H4198 | Hodgdon | Extruida, SB | Rapido (53) | ~3860 | 0.82 | .222, .223, varmint |
| 4 | Hodgdon H322 | Hodgdon | Extruida, SB | Medio-Rapido (60) | ~3850 | 0.86 | .223, bench rest |
| 5 | Vihtavuori N133 | Vihtavuori | Extruida, SB | Medio-Rapido (62) | 3630 | 0.89 | .223 Rem, 6mm PPC |
| 6 | Hodgdon H335 | Hodgdon | Esferica, SB | Medio (68) | 3980 | 0.94 | .223 Rem, 5.56 NATO |
| 7 | Vihtavuori N135 | Vihtavuori | Extruida, SB | Medio (70) | 3590 | 0.90 | .308 Win, .223 Rem |
| 8 | IMR 4064 | IMR/Hodgdon | Extruida, SB | Medio (80) | 3880 | 0.90 | .308 Win, .30-06 |
| 9 | Hodgdon Varget | Hodgdon/ADI | Extruida, SB | Medio (82) | 4050 | 0.92 | .308 Win, 6.5 CM |
| 10 | Hodgdon H4895 | Hodgdon/ADI | Extruida, SB | Medio (83) | 4060 | 0.91 | .308 Win, .30-06 |
| 11 | Vihtavuori N140 | Vihtavuori | Extruida, SB | Medio (85) | 3720 | 0.92 | .308 Win, 6.5 CM |
| 12 | Vihtavuori N150 | Vihtavuori | Extruida, SB | Medio-Lento (90) | 3780 | 0.93 | .308 Win, .30-06 |
| 13 | IMR 4350 | IMR/Hodgdon | Extruida, SB | Medio-Lento (95) | 3760 | 0.88 | .270 Win, .30-06 |
| 14 | Hodgdon H4350 | Hodgdon/ADI | Extruida, SB | Medio-Lento (96) | 3760 | 0.89 | 6.5 CM, .270 Win |
| 15 | Vihtavuori N160 | Vihtavuori | Extruida, SB | Medio-Lento (100) | 3620 | 0.93 | .30-06, 7mm RM |
| 16 | Vihtavuori N165 | Vihtavuori | Extruida, SB | Lento (105) | 3500 | 0.94 | Magnum medios |
| 17 | IMR 4831 | IMR/Hodgdon | Extruida, SB | Lento (108) | 3720 | 0.87 | .270 Win, magnums |
| 18 | Hodgdon H4831SC | Hodgdon/ADI | Extruida, SB | Lento (110) | 3870 | 0.89 | Magnums medios |
| 19 | Vihtavuori N560 | Vihtavuori | Extruida, DB | Lento (115) | 4020 | 0.95 | 6.5 CM, 7mm RM |
| 20 | Hodgdon Retumbo | Hodgdon/ADI | Extruida, SB | Muy Lento (120) | 3710 | 0.88 | .300 WM, .338 LM |
| 21 | Hodgdon H1000 | Hodgdon/ADI | Extruida, SB | Muy Lento (122) | 3630 | 0.87 | .300 WM, .338 LM |
| 22 | Vihtavuori N570 | Vihtavuori | Extruida, DB | Muy Lento (125) | 3950 | 0.96 | .300 WM, magnums |

**Leyenda**: SB = Single Base (Base Simple), DB = Double Base (Base Doble). Burn Rate Relativo es un
indice ordinal aproximado (menor = mas rapido); los numeros son orientativos basados en la Hodgdon 2024
Relative Burn Rate Chart. Las temperaturas de llama provienen de datos de QuickLOAD publicados en
foros de balistica.

**Valores por defecto para simulacion cuando no se dispone de datos especificos del propelente**:
- Constante de fuerza F: 950 kJ/kg (SB), 1080 kJ/kg (DB)
- Covolumen eta: 1.00 cm3/g
- Ratio calores especificos gamma: 1.24 (SB), 1.22 (DB)
- Estos valores son tipicos para propelentes de rifle de base simple (NC ~13% N)

**Fuentes**: Hodgdon 2024 Relative Burn Rate Chart; AccurateShooter Forum "Smokeless Powder Flame Temp" thread; QuickLOAD Interior Ballistics Software Database; GrafsAndSons Burn Rate Chart; DTIC ADA590866.

### 1.3 Parametros de Ecuacion de Noble-Abel para Simulacion

La ecuacion de estado Noble-Abel usada en balistica interior es:

```
P * (V - eta * m_c) = m_c * F * z
```

donde:
- P = presion (Pa)
- V = volumen disponible (m3)
- eta = covolumen (m3/kg), tipicamente ~0.001 m3/kg (= 1.0 cm3/g)
- m_c = masa de carga (kg)
- F = constante de fuerza / impetus (J/kg)
- z = fraccion de masa quemada (0 a 1)

Valores recomendados por defecto para el simulador:

| Parametro | Simbolo | Valor Base Simple | Valor Base Doble | Unidades |
|-----------|---------|-------------------|-------------------|----------|
| Constante de Fuerza | F | 950,000 | 1,080,000 | J/kg |
| Covolumen | eta | 0.001 | 0.001 | m3/kg |
| Temp. Llama Adiabatica | T_v | 2800 | 3400 | K |
| Ratio Calores Especificos | gamma | 1.24 | 1.22 | - |
| Masa Molecular Media Gases | M_w | 0.024 | 0.026 | kg/mol |

**Fuentes**: DTIC AD0412685 "Measurement of Impetus, Covolume"; AMCP 706-175; PMC "Mechanical Properties of Gun Propellants"; Fraunhofer "LTC Gun Propellants".

---

## 2. Materiales de Vainas

### 2.1 Laton para Cartuchos - C26000 (Cartridge Brass, 70/30)

El laton C26000 (UNS C26000, CW505L) es la aleacion estandar para vainas de cartuchos metalicos.
Composicion: 70% Cu, 30% Zn.

#### Propiedades Mecanicas por Temper

| Propiedad | Recocido (OS025) | Recocido (OS050) | 1/4 Duro (H01) | 1/2 Duro (H02) | Duro (H04) | Unidades |
|-----------|-------------------|-------------------|-----------------|-----------------|------------|----------|
| Modulo de Young (E) | 110 | 110 | 110 | 110 | 110 | GPa |
| Limite Elastico (Yield) | 140 | 110 | 275 | 345 | 435 | MPa |
| Resistencia a Traccion (UTS) | 350 | 330 | 385 | 435 | 525 | MPa |
| Elongacion a Rotura | 50 | 62 | 43 | 32 | 8 | % |
| Dureza Rockwell B | 55 | 53 | 65 | 75 | 82 | HRB |

#### Propiedades Fisicas (todas las condiciones)

| Propiedad | Valor | Unidades |
|-----------|-------|----------|
| Densidad | 8,530 | kg/m3 |
| Modulo de Young | 110 | GPa |
| Modulo de Corte | 41 | GPa |
| Coeficiente de Poisson | 0.31 | - |
| Coef. Expansion Termica | 20.0 | um/(m*K) |
| Conductividad Termica | 120 | W/(m*K) |
| Calor Especifico | 375 | J/(kg*K) |

**Nota para simulacion**: Las vainas de cartucho se fabrican por embuticion profunda a partir de
copas de laton recocido, y luego se endurecen por trabajo mecanico. El cuello de la vaina suele
recocerse para permitir la sujecion del proyectil, mientras que la base permanece mas dura. En la
simulacion, usar valores de H02 (1/2 Duro) para la base y OS050 (recocido) para el cuello es
una aproximacion razonable.

**Fuentes**: MakeItFrom.com UNS C26000; MatWeb C26000 OS070 y H02 Temper datasheets; Copper.org C26000 Alloy page; Concast C26000 datasheet.

### 2.2 Acero para Vainas Militares - AISI 4130

Algunas vainas militares (especialmente ex-sovieticas y de bajo coste) usan acero lacado o
acero con revestimiento de cobre en lugar de laton. El acero AISI 4130 (Cr-Mo) es representativo.

| Propiedad | Valor | Unidades |
|-----------|-------|----------|
| Modulo de Young (E) | 205 | GPa |
| Limite Elastico (Yield) | 435 | MPa |
| Resistencia a Traccion (UTS) | 670 | MPa |
| Elongacion a Rotura | 25.5 | % |
| Dureza Rockwell B | 92 | HRB |
| Densidad | 7,850 | kg/m3 |
| Coeficiente de Poisson | 0.29 | - |
| Coef. Expansion Termica | 11.2 | um/(m*K) |

**Nota**: Las vainas de acero son mas rigidas que las de laton, no sellan la recamara con la misma
eficacia (menor expansion elastica), y generan mayor friccion en la extraccion.

**Fuentes**: ThomasNet "All About 4130 Steel"; AZoM AISI 4130; TechSteel 4130 datasheet; Wikipedia 41xx steel.

### 2.3 Coeficientes de Friccion Vaina-Recamara

Mediciones experimentales del coeficiente de friccion entre acero inoxidable 416 y laton C26000
(cartridge brass), realizadas por Varmint Al (varmintal.com):

| Condicion de Superficie | Coef. Friccion (mu) |
|------------------------|---------------------|
| Lijado grano 220 (rugoso) | 0.37 |
| Mecanizado con fresa | 0.34 |
| Lijado grano 400 | 0.33 |
| Lijado grano 220 + aceite 3-in-1 | 0.31 |
| Lijado grano 600 | 0.29 |
| Tela de crocus (fino) | 0.27 |
| Grano 600 + pulido Flitz | 0.19 |
| Grano 600 + Flitz + JB paste | 0.13 |
| Pulido con rueda de buffing | 0.12 |

**Valores generales para simulacion**:

| Par de Materiales | Estatico (seco) | Estatico (lubricado) |
|-------------------|-----------------|----------------------|
| Laton / Acero | 0.35 | 0.19 |
| Laton / Acero inox. (pulido) | 0.33 | 0.13 |
| Acero / Acero (vaina militar) | 0.50 | 0.25 |
| Cobre (camisa bala) / Acero canon | 0.36 | 0.20 |

**Valor recomendado para simulacion de disparo tipico (recamara pulida, sin lubricar)**:
- mu = 0.30 - 0.35 para vaina de laton
- mu = 0.40 - 0.50 para vaina de acero

**Fuentes**: Varmint Al "Friction Coefficient Tests of 416 Stainless Steel on Cartridge Brass" (varmintal.com); Engineering Toolbox "Friction Coefficients"; Schneider & Company "Coefficient of Friction Reference Chart".

---

## 3. Especificaciones SAAMI/CIP de Presion

### 3.1 Presiones Maximas - Cartuchos de Rifle Comunes

Las presiones se expresan como Maximum Average Pressure (MAP) para SAAMI y Pmax para CIP.

| Cartucho | SAAMI MAP (psi) | SAAMI MAP (MPa) | CIP Pmax (bar) | CIP Pmax (MPa) | Metodo |
|----------|-----------------|-----------------|-----------------|-----------------|--------|
| .223 Remington | 55,000 | 379.2 | 4,300 | 430.0 | Piezo |
| 5.56x45 NATO | 55,000 (SAAMI) / ~62,000 (EPVAT) | 379.2 / 427.5 | 4,300 | 430.0 | Piezo/EPVAT |
| .243 Winchester | 60,000 | 413.7 | 4,150 | 415.0 | Piezo |
| 6mm Creedmoor | 62,000 | 427.5 | 4,300 | 430.0 | Piezo |
| 6.5 Creedmoor | 62,000 | 427.5 | 4,200 | 420.0 | Piezo |
| .270 Winchester | 65,000 | 448.2 | 4,300 | 430.0 | Piezo |
| 7mm Remington Mag | 61,000 | 420.6 | 4,300 | 430.0 | Piezo |
| .308 Winchester | 62,000 | 427.5 | 4,150 | 415.0 | Piezo |
| .30-06 Springfield | 60,000 | 413.7 | 4,050 | 405.0 | Piezo |
| .300 Winchester Mag | 64,000 | 441.3 | 4,300 | 430.0 | Piezo |
| .300 PRC | 65,000 | 448.2 | 4,200 | 420.0 | Piezo |
| .338 Lapua Magnum | 65,000 | 448.2 | 4,200 | 420.0 | Piezo |
| .375 H&H Magnum | 62,000 | 427.5 | 4,150 | 415.0 | Piezo |

**Notas importantes**:
- SAAMI mide con transductor conformal; CIP mide con transductor de canal (drilled case).
- Los valores SAAMI y CIP NO son directamente comparables debido a diferencias en metodologia.
- NATO EPVAT usa un estandar diferente a ambos (STANAG 4172 para 5.56).
- La prueba de verificacion CIP requiere +25% sobre Pmax (ej: .223 Rem prueba a 537.5 MPa).
- Conversion: 1 bar = 0.1 MPa = 14.5038 psi

**Fuentes**: SAAMI Technical Information (saami.org); The Ballistic Assistant SAAMI Rifle Cartridge Catalog; Wikipedia "Small Arms Ammunition Pressure Testing"; Wikipedia ".223 Remington", ".300 Winchester Magnum", "6.5mm Creedmoor"; CIP TDCC online database (cip-bobp.org); kwk.us "Cartridge Pressure Standards".

### 3.2 Dimensiones de Recamara Criticas para Simulacion

Para la simulacion de balistica interior, las dimensiones mas relevantes son:

| Cartucho | Diametro Anima (mm) | Long. Canon Prueba (mm) | Vol. Caso Agua (cm3) aprox. |
|----------|--------------------|-----------------------|---------------------------|
| .223 Remington | 5.70 (.224") | 610 (24") | 1.83 |
| 5.56x45 NATO | 5.70 (.224") | 508 (20") | 1.85 |
| .243 Winchester | 6.17 (.243") | 610 (24") | 3.39 |
| 6.5 Creedmoor | 6.72 (.264") | 610 (24") | 3.43 |
| .270 Winchester | 7.04 (.277") | 610 (24") | 4.17 |
| 7mm Rem Mag | 7.21 (.284") | 610 (24") | 5.12 |
| .308 Winchester | 7.82 (.308") | 610 (24") | 3.53 |
| .30-06 Springfield | 7.82 (.308") | 610 (24") | 4.38 |
| .300 Win Mag | 7.82 (.308") | 610 (24") | 5.53 |
| .338 Lapua Mag | 8.61 (.338") | 686 (27") | 5.94 |

**Nota**: Los volumenes de caso son aproximados (agua, con bala asentada). Varian segun fabricante
de la vaina. Usar datos exactos cuando se disponga de ellos.

**Fuentes**: SAAMI cartridge drawings; CIP TDCC dimensional tables; reloading manual data.

---

## 4. Coeficientes Balisticos de Proyectiles

### 4.1 Modelos de Arrastre G1 vs G7

- **G1**: Basado en proyectil tipo Krupp de punta plana y base plana. Estandar historico, la mayoria
  de fabricantes publican BC en G1. Varia significativamente con la velocidad para balas modernas.
- **G7**: Basado en proyectil tipo tangent-ogive con cola de bote. Mas estable con la velocidad para
  balas modernas de perfil aerodinamico. Preferido para simulacion de largo alcance.

**Formula de Densidad Seccional (SD)**:
```
SD = (peso_grains / 7000) / (diametro_pulgadas)^2
```

### 4.2 Proyectiles Sierra MatchKing

| Calibre | Peso (gr) | Modelo | BC G1 | BC G7 | SD |
|---------|-----------|--------|-------|-------|-----|
| .224 | 69 | HPBT MK #1380 | 0.301 | 0.153 | 0.197 |
| .224 | 77 | HPBT MK #1380C | 0.340 | 0.175 | 0.219 |
| .264 | 123 | HPBT MK #1727 | 0.510 | 0.255 | 0.252 |
| .264 | 130 | HPBT TMK #7430 | 0.560 | 0.283 | 0.266 |
| .264 | 140 | HPBT MK #1740 | 0.585 | 0.295 | 0.287 |
| .264 | 150 | HPBT MK #1750 | 0.713 | 0.360 | 0.307 |
| .308 | 155 | HPBT Palma MK #2155 | 0.450 | 0.212 | 0.233 |
| .308 | 168 | HPBT MK #2200 | 0.462 | 0.218 | 0.253 |
| .308 | 175 | HPBT MK #2275 | 0.505 | 0.243 | 0.264 |
| .308 | 190 | HPBT MK #2210 | 0.533 | 0.265 | 0.286 |
| .308 | 200 | HPBT MK #2231 | 0.565 | 0.285 | 0.301 |

**Nota**: Los BC G1 de Sierra varian con la velocidad. Los valores mostrados corresponden al rango
de velocidad superior (>2400 fps). Sierra publica hasta 3 valores de BC G1 por rango de velocidad.
Los BC G7 son valores promedio publicados por Bryan Litz (Applied Ballistics).

**Fuentes**: Sierra Bullets Ballistic Coefficients (sierrabullets.com); Applied Ballistics LLC BC Testing Reports; DTIC ADA554683 "Comparing Advertised Ballistic Coefficients with Independent Measurements".

### 4.3 Proyectiles Hornady ELD Match

| Calibre | Peso (gr) | Modelo | BC G1 | BC G7 | SD |
|---------|-----------|--------|-------|-------|-----|
| .224 | 73 | ELD Match #22774 | 0.390 | 0.198 | 0.208 |
| .224 | 80 | ELD Match #22831 | 0.426 | 0.215 | 0.228 |
| .264 | 120 | ELD Match #26174 | 0.486 | 0.245 | 0.246 |
| .264 | 130 | ELD Match #26177 | 0.541 | 0.274 | 0.266 |
| .264 | 140 | ELD Match #26331 | 0.646 | 0.326 | 0.287 |
| .264 | 147 | ELD Match #26333 | 0.697 | 0.351 | 0.301 |
| .308 | 155 | ELD Match #30313 | 0.467 | 0.236 | 0.233 |
| .308 | 168 | ELD Match #30506 | 0.523 | 0.264 | 0.253 |
| .308 | 178 | ELD Match #30713 | 0.530 | 0.268 | 0.268 |
| .308 | 200 | ELD Match #30718 | 0.597 | 0.301 | 0.301 |
| .338 | 285 | ELD Match #33381 | 0.789 | 0.398 | 0.356 |

**Nota**: Los valores corresponden a la medicion a Mach 2.25 (200 yardas, ~2512 fps) que Hornady
utiliza como referencia estandar. Los BC G7 de Hornady para ELD Match han sido validados
independientemente por Bryan Litz y generalmente coinciden dentro del 2%.

**Fuentes**: Hornady Manufacturing BC page (hornady.com/bc); Hornady product catalog; Sniper's Hide forum Hornady BC discussions; AccurateShooter bulletin "Litz Field-Tests BCs of Sierra Tipped MatchKings".

### 4.4 Proyectiles Berger Hybrid Target / VLD

| Calibre | Peso (gr) | Modelo | BC G1 | BC G7 | SD |
|---------|-----------|--------|-------|-------|-----|
| .224 | 73 | VLD Target | 0.355 | 0.181 | 0.208 |
| .224 | 80.5 | Fullbore Target | 0.422 | 0.215 | 0.229 |
| .264 | 130 | VLD Target | 0.540 | 0.275 | 0.266 |
| .264 | 140 | Hybrid Target | 0.607 | 0.311 | 0.287 |
| .264 | 140 | VLD Target | 0.584 | 0.298 | 0.287 |
| .264 | 144 | LR Hybrid Target | 0.638 | 0.325 | 0.295 |
| .308 | 155 | VLD Target | 0.464 | 0.245 | 0.233 |
| .308 | 168 | VLD Target | 0.505 | 0.260 | 0.253 |
| .308 | 175 | OTM Tactical | 0.518 | 0.264 | 0.264 |
| .308 | 185 | Hybrid Target | 0.569 | 0.295 | 0.279 |
| .308 | 200 | Hybrid Target | 0.610 | 0.316 | 0.301 |
| .308 | 200.20X | Hybrid Target | 0.635 | 0.328 | 0.301 |
| .308 | 215 | Hybrid Target | 0.691 | 0.354 | 0.324 |
| .308 | 230 | Hybrid Target | 0.717 | 0.368 | 0.346 |

**Fuentes**: Berger Bullets product page (bergerbullets.com); Berger Quick Reference Sheets PDF; Applied Ballistics LLC data; DTIC ADA554683.

### 4.5 Otros Proyectiles Comunes

| Calibre | Peso (gr) | Fabricante/Modelo | BC G1 | BC G7 | SD |
|---------|-----------|-------------------|-------|-------|-----|
| .224 | 55 | Hornady FMJ-BT | 0.235 | 0.118 | 0.157 |
| .224 | 62 | M855 SS109 FMJ | 0.304 | 0.151 | 0.177 |
| .264 | 140 | Nosler AccuBond | 0.509 | 0.255 | 0.287 |
| .277 | 130 | Nosler AccuBond | 0.435 | 0.215 | 0.242 |
| .277 | 150 | Nosler Partition | 0.465 | 0.228 | 0.279 |
| .284 | 162 | Hornady ELD-X | 0.631 | 0.316 | 0.287 |
| .308 | 147 | M80 FMJ BT (NATO) | 0.393 | 0.197 | 0.221 |
| .308 | 150 | Nosler Partition | 0.387 | 0.194 | 0.226 |
| .308 | 168 | Nosler AccuBond LR | 0.541 | 0.271 | 0.253 |
| .308 | 175 | Sierra TMK | 0.520 | 0.265 | 0.264 |
| .308 | 190 | Hornady Sub-X | 0.431 | 0.215 | 0.286 |
| .338 | 250 | Sierra MK | 0.587 | 0.295 | 0.313 |
| .338 | 300 | Berger Hybrid OTM | 0.818 | 0.419 | 0.375 |

**Fuentes**: Nosler 2026 Product Guide; Hornady catalog; Sierra Bullets BC listing; manufacturer published data.

### 4.6 Tabla Resumen de Densidad Seccional

La densidad seccional (SD) es una medida de la masa del proyectil por unidad de area transversal.
Valores tipicos para proyectiles comunes de rifle:

| Calibre | Diametro (in) | Peso (gr) | SD |
|---------|---------------|-----------|------|
| .224 (5.56mm) | 0.224 | 55 | 0.157 |
| .224 (5.56mm) | 0.224 | 77 | 0.219 |
| .243 (6mm) | 0.243 | 105 | 0.254 |
| .264 (6.5mm) | 0.264 | 120 | 0.246 |
| .264 (6.5mm) | 0.264 | 140 | 0.287 |
| .264 (6.5mm) | 0.264 | 147 | 0.301 |
| .277 (6.8mm) | 0.277 | 130 | 0.242 |
| .277 (6.8mm) | 0.277 | 150 | 0.279 |
| .284 (7mm) | 0.284 | 162 | 0.287 |
| .284 (7mm) | 0.284 | 175 | 0.310 |
| .308 (7.62mm) | 0.308 | 147 | 0.221 |
| .308 (7.62mm) | 0.308 | 155 | 0.233 |
| .308 (7.62mm) | 0.308 | 168 | 0.253 |
| .308 (7.62mm) | 0.308 | 175 | 0.264 |
| .308 (7.62mm) | 0.308 | 190 | 0.286 |
| .308 (7.62mm) | 0.308 | 200 | 0.301 |
| .338 (8.6mm) | 0.338 | 250 | 0.313 |
| .338 (8.6mm) | 0.338 | 300 | 0.375 |

**Fuentes**: ChuckHawks "Sectional Density"; Wikipedia "Sectional density"; Reloader.com "Sectional Density".

---

## 5. Friccion de Anima y Recamara

### 5.1 Friccion Bala-Canon (Bore Friction)

La friccion entre el proyectil y el anima del canon es un factor critico en balistica interior.
Depende del material de la camisa del proyectil, el acabado del anima, y la velocidad.

| Par de Materiales | Coef. Friccion Tipico | Notas |
|-------------------|----------------------|-------|
| Cobre-Zinc (gilding metal) / Acero canon | 0.02 - 0.05 | A alta velocidad (>500 m/s) |
| Cobre-Zinc / Acero canon | 0.10 - 0.20 | A baja velocidad, enganche estrías |
| Plomo / Acero | 0.15 - 0.25 | Balas de plomo sin camisa |

**Nota**: La friccion en el anima es altamente dependiente de la velocidad. A velocidades tipicas
de proyectil (600-900 m/s), el coeficiente de friccion efectivo es mucho menor que el estatico
debido a efectos termicos, lubricacion por gases, y deformacion plastica del material de camisa.

**Fuerza de friccion tipica medida**:
- Para 5.56 NATO: ~125 lbs (556 N) fuerza promedio, ~234.5 ft-lbs de energia total para
  recorrer todo el canon.
- Para .308 Win: ~150-200 lbs (670-890 N) fuerza promedio estimada.

**Presion de enganche (engraving pressure)**:
La presion necesaria para forzar el proyectil a traves del inicio del estriado es tipicamente
de 20-50 MPa (3,000 - 7,000 psi), dependiendo del calibre y tipo de proyectil.

**Fuentes**: DTIC ADA555779 "Measuring Barrel Friction in the 5.56mm NATO"; ScienceDirect "Velocity dependence of barrel friction"; ResearchGate "Barrel Friction in Sport Rifles"; Wikipedia "Internal Ballistics"; CloseFocusResearch "Calculating Barrel Pressure".

---

## 6. Fuentes y Referencias

### 6.1 Fuentes Primarias y Estandares

1. **SAAMI** - Sporting Arms and Ammunition Manufacturers' Institute
   - saami.org - Pressure standards, cartridge dimensions
   - ANSI/SAAMI Z299 series standards

2. **CIP** - Commission Internationale Permanente
   - cip-bobp.org - European pressure standards, TDCC tables
   - Measurement per CIP channel transducer methodology

3. **NATO STANAG 4172** - 5.56x45mm NATO standard
   - EPVAT testing methodology

### 6.2 Referencias Tecnicas de Propelentes

4. **AMCP 706-175** - Engineering Design Handbook, Explosives Series
   - bulletpicker.com/pdf/AMCP-706-175.pdf

5. **DTIC ADA590866** - "The Thermodynamics of Interior Ballistics and Propellant Performance"
   - apps.dtic.mil/sti/pdfs/ADA590866.pdf

6. **DTIC AD0412685** - "Measurement of the Impetus, Covolume"
   - apps.dtic.mil/sti/tr/pdf/AD0412685.pdf

7. **DTIC ADA474230** - "Cool Propellants: Flame Temperatures and Force Constants"
   - apps.dtic.mil/sti/tr/pdf/ADA474230.pdf

8. **Fraunhofer ICT** - "LTC Gun Propellants for Machine Gun Ammunition"
   - publica.fraunhofer.de

9. **QuickLOAD** - Interior Ballistics Software (Neco Inc.)
   - Propellant database con >225 polvoras

### 6.3 Datos de Fabricantes

10. **Hodgdon Powder Co.** - 2024 Smokeless Relative Burn Rate Chart
    - hodgdonpowderco.com

11. **Sierra Bullets** - Ballistic Coefficients
    - sierrabullets.com/resources/ballistic-coefficients/

12. **Hornady Manufacturing** - BC Data
    - hornady.com/bc

13. **Berger Bullets** - Bullet Reference Charts and Ballistics Calculator
    - bergerbullets.com/information/lines-and-designs/bullet-reference-charts/

14. **Nosler** - 2026 Product Guide
    - nosler.com

### 6.4 Datos de Materiales

15. **MakeItFrom.com** - UNS C26000 Cartridge Brass properties
    - makeitfrom.com/material-properties/UNS-C26000-CW505L-Cartridge-Brass

16. **MatWeb** - C26000 datasheets (OS070, H02 temper)
    - matweb.com

17. **Copper.org** - C26000 Alloy data
    - alloys.copper.org/alloy/C26000

18. **Varmint Al** - Friction coefficient tests
    - varmintal.com/afric.htm

### 6.5 Publicaciones y Analisis Independientes

19. **Applied Ballistics LLC** (Bryan Litz) - BC testing reports
    - appliedballisticsllc.com

20. **DTIC ADA554683** - "Comparing Advertised BCs with Independent Measurements"
    - apps.dtic.mil/sti/tr/pdf/ADA554683.pdf

21. **DTIC ADA555779** - "Measuring Barrel Friction in the 5.56mm NATO"
    - apps.dtic.mil/sti/tr/pdf/ADA555779.pdf

22. **AccurateShooter Forum** - Smokeless Powder Flame Temperature data
    - forum.accurateshooter.com

---

## Notas de Uso para el Simulador

### Precision de los Datos

- **Datos de BC**: Precision tipica +/- 3% respecto a mediciones independientes. Los BC G7 son
  mas estables con la velocidad y preferibles para simulacion.
- **Datos de presion SAAMI/CIP**: Son estandares oficiales, pero los valores reales de produccion
  suelen estar 5-10% por debajo del maximo.
- **Propiedades termoquimicas de propelentes**: Los valores de temperatura de llama tienen
  incertidumbre de +/- 5-10%. Los valores de constante de fuerza y covolumen son mas precisos
  (+/- 2-3%) cuando provienen de ensayos en bomba cerrada.
- **Coeficientes de friccion**: Alta variabilidad segun condiciones de superficie. Usar rangos
  en lugar de valores puntuales cuando sea posible.

### Validacion Recomendada

Para validar el simulador, comparar resultados con:
1. **QuickLOAD** - Software comercial de referencia para balistica interior
2. **Lyman Reloading Handbook** (51st Edition) - Datos de presion y velocidad medidos
3. **Hornady Handbook of Cartridge Reloading** - Datos extensivos de presion/velocidad
4. **Datos SAAMI/CIP** - Para verificar que presiones maximas no se exceden

### Formato de Datos para Importacion

Se recomienda crear archivos JSON o TOML con los datos de esta base de datos para importacion
directa al simulador. Ejemplo de estructura sugerida:

```json
{
  "propellant": {
    "name": "Hodgdon H4350",
    "type": "single_base",
    "manufacturer": "Hodgdon",
    "force_constant_J_per_kg": 950000,
    "covolume_m3_per_kg": 0.001,
    "flame_temperature_K": 3760,
    "gamma": 1.24,
    "bulk_density_kg_per_m3": 890
  }
}
```

```json
{
  "bullet": {
    "name": "Hornady 6.5mm 140gr ELD Match",
    "caliber_mm": 6.72,
    "diameter_in": 0.264,
    "weight_gr": 140,
    "weight_kg": 0.009072,
    "bc_g1": 0.646,
    "bc_g7": 0.326,
    "sectional_density": 0.287,
    "length_mm": 32.5
  }
}
```
