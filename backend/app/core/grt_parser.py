"""Parser for Gordon's Reloading Tool (GRT) .propellant XML files.

GRT .propellant files are XML documents containing propellant thermochemical
and ballistic parameters. This module extracts the raw parameters into a
typed dictionary for downstream conversion.
"""

import io
import zipfile
from urllib.parse import unquote
from xml.etree import ElementTree

# Fields we extract from GRT XML (name -> expected type)
_DECIMAL_FIELDS = {
    "Bp", "Br", "Brp", "Ba", "Qex", "k", "a0",
    "z1", "z2", "eta", "pc", "pcd", "pt", "tcc", "tch", "Qlty",
}
_STRING_FIELDS = {"mname", "pname", "lotid", "cdate", "cby", "mdate", "mby", "origin", "descr"}


def parse_propellant_file(xml_content: str | bytes) -> dict:
    """Parse a single .propellant XML file into a raw parameter dict.

    Args:
        xml_content: XML content as string or bytes.

    Returns:
        Dictionary with all GRT parameters. Decimal fields are converted to float,
        string fields remain as str. The 'pname' field is URL-decoded.

    Raises:
        ValueError: If the XML is malformed or missing required structure.
    """
    if isinstance(xml_content, bytes):
        xml_content = xml_content.decode("utf-8")

    try:
        root = ElementTree.fromstring(xml_content)
    except ElementTree.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    propellant_file = root.find("propellantfile")
    if propellant_file is None:
        raise ValueError("Missing <propellantfile> element in XML")

    params: dict = {}
    for var_elem in propellant_file.findall("var"):
        name = var_elem.get("name", "")
        value = var_elem.get("value", "")

        if name in _DECIMAL_FIELDS:
            try:
                params[name] = float(value)
            except (ValueError, TypeError):
                params[name] = 0.0
        elif name in _STRING_FIELDS:
            if name == "pname":
                params[name] = unquote(value)
            else:
                params[name] = value

    # Validate minimum required fields
    required = {"pname", "Qex", "k", "Ba", "eta", "pc"}
    missing = required - set(params.keys())
    if missing:
        raise ValueError(f"Missing required GRT fields: {missing}")

    return params


def parse_propellant_zip(zip_bytes: bytes) -> list[dict]:
    """Parse a ZIP archive containing multiple .propellant files.

    Args:
        zip_bytes: Raw bytes of the ZIP file.

    Returns:
        List of parsed parameter dicts, one per .propellant file found.

    Raises:
        ValueError: If the ZIP is invalid or contains no .propellant files.
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile as e:
        raise ValueError(f"Invalid ZIP file: {e}") from e

    results = []
    errors = []

    propellant_files = [n for n in zf.namelist() if n.lower().endswith(".propellant")]
    if not propellant_files:
        raise ValueError("ZIP archive contains no .propellant files")

    for filename in sorted(propellant_files):
        try:
            content = zf.read(filename)
            params = parse_propellant_file(content)
            params["_source_file"] = filename
            results.append(params)
        except (ValueError, KeyError) as e:
            errors.append(f"{filename}: {e}")

    if errors and not results:
        raise ValueError(f"All files failed to parse: {'; '.join(errors)}")

    return results
