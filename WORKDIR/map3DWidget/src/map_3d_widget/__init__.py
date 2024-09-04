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

def show_3d(data, selection=0):
    if isinstance(data, list):
        return Map3DWidget(data=data, selection=selection)
    else:
        return Map3DWidget(data=[data], selection=0)
