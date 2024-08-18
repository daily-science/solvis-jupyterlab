function loadScript(src) {
    return new Promise((resolve, reject) => {
        let script = Object.assign(document.createElement("script"), {
            type: "text/javascript",
            async: true,
            src: src,
        });
        script.addEventListener("load", resolve);
        script.addEventListener("error", reject);
        document.body.appendChild(script);
    });
}

await loadScript("https://js.arcgis.com/4.30/");

function render({ model, el }) {

    const div = document.createElement("div");
    div.style.width = model.get("width");
    div.style.height = model.get("height");

    const geojson = model.get("geojson");

    require([
        "esri/views/SceneView",
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/renderers/SimpleRenderer",
        "esri/symbols/PolygonSymbol3D",
    ], (
        SceneView,
        Map,
        GeoJSONLayer,
        SimpleRenderer,
        PolygonSymbol3D,
    ) => {
        const initialViewParams = {
            zoom: 7,
            center: [174.777, -41.288],
            container: div
        };

        const scene = new Map({
            basemap: "gray-vector", ground: {
                // navigationConstraint: "none",
                opacity: 0.8
            },
        });

        initialViewParams.container = null;
        initialViewParams.map = scene;
        const sceneView = new SceneView(initialViewParams);
        sceneView.container = div;

        // prevent jupyterlab from popping up the context menu
        div.addEventListener("contextmenu", function (ev) {
            ev.stopPropagation();
        })

        const createSceneRenderer = () => new SimpleRenderer({
            symbol: new PolygonSymbol3D({
                symbolLayers: [{
                    type: 'fill',
                    material: { color: [0, 0, 242, 0.5] },
                }]
            })
        });

        model.on("msg:custom", (msg) => {
            try {
                if (msg?.geojson) {
                    const geojson = msg.geojson;

                    //arcgis expects elevation in meters
                    for (const feature of geojson.features) {
                        if (feature.geometry.type === 'Polygon') {
                            const coords = feature.geometry.coordinates[0];
                            for (var i = 0; i < coords.length; i++) {
                                const [lon, lat, ele] = coords[i];
                                coords[i] = [lon, lat, ele * -1000];
                            }
                        }
                    }
                    // create a new blob from geojson featurecollection
                    const blob = new Blob([JSON.stringify(geojson)], {
                        type: "application/json"
                    });

                    // URL reference to the blob
                    const url = URL.createObjectURL(blob);

                    const layer = new GeoJSONLayer({
                        url,
                        elevationInfo: { mode: "absolute-height" },
                        hasZ: true,
                        blendMode: "multiply"
                    });

                    layer.renderer = createSceneRenderer();
                    scene.add(layer);
                }
            } catch (err) {
                console.error(err);
            }
        });


    });
    el.appendChild(div);

}

export default { render };