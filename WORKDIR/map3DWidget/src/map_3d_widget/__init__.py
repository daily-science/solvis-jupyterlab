import importlib.metadata
import pathlib

import anywidget
import traitlets

try:
    __version__ = importlib.metadata.version("map_3d_widget")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"


class Map3DWidget(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "widget.js"
    _css = pathlib.Path(__file__).parent / "static" / "widget.css"
    _camera = traitlets.Dict().tag(sync=True)
    data = traitlets.List().tag(sync=True)
    width = traitlets.Unicode('100%').tag(sync=True, o=True)
    height = traitlets.Unicode('400px').tag(sync=True, o=True)
    selection = traitlets.Int(0).tag(sync=True)
    extrusion = traitlets.Float(0).tag(sync=True)

def show_3d(data, selection=0, extrusion=0):
    if isinstance(data, list):
        return Map3DWidget(data=data, selection=selection, extrusion=extrusion)
    else:
        return Map3DWidget(data=[data], selection=0, extrusion=extrusion)

# def bar_chart_map(data, property_name):
#     values = [feature["properties"][property_name] for feature in data["features"]]
#     scale = 1000.0 / max(values)
#     features = [make_bar(feature, property_name, scale) for feature in data["features"]]
#     geojson = {"type": "FeatureCollection", "features": features}
#     return show_3d(geojson)

def barchart_map(gj, property, height = 500000.0, color_scale = "inferno"):
    values = [feature["properties"][property] for feature in gj["features"]]
    color_values = get_colour_values(
                    color_scale=color_scale,
                    color_scale_vmax=max(values),
                    color_scale_vmin=max(min(values), 1e-20),
                    color_scale_normalise= ColourScaleNormaliseEnum.LIN.value,
                    values=tuple(values),
                )
    for idx, feature in enumerate(gj["features"]):
        try:
            color = color_values[idx]
        except (ValueError):
            print(f"warning no rate found for index: {feature['properties']['FaultID']} faultname: `{feature['properties']['FaultName']}`")
            color = 'cyan'
        feature["properties"]["style"] = {
            "color": color,
            "weight": 1,
            "fillColor": color,
            "fillOpacity": 1,
        }
    scale = height / max(values)
    show_3d(gj, -1, scale)