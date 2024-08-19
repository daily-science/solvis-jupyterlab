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

    try {
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
            "esri/widgets/Slider",
        ], (
            SceneView,
            Map,
            GeoJSONLayer,
            SimpleRenderer,
            PolygonSymbol3D,
            Slider,
        ) => {

            console.log("hello!");
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

            const template = {
                title: "Section {FaultID}:{ParentID}",
                content: "name: <b>{FaultName}</b>",

            };

            function createGeoJsonLayer(geojson) {
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
                    renderer: createSceneRenderer(),
                    popupTemplate: template,
                });
                return layer;
            }

            const selectionLayers = [];

            const sliderDiv = document.createElement("div");
            document.body.appendChild(sliderDiv);
            sliderDiv.style="width:300px";

            const slider = new Slider({
                container: sliderDiv,
                min: 0,
                max: 100,
                values: [ 50 ],
                snapOnClickEnabled: false,
                visibleElements: {
                  labels: true,
                  rangeLabels: true
                }
              });

            sceneView.ui.add(slider, "bottom-right");



            model.on("msg:custom", (msg) => {
                try {
                    if (msg?.geojson) {
                        const layer = createGeoJsonLayer(msg.geojson);
                        scene.add(layer);
                    } else if (msg?.geojsons) {
                        for (const geojson of msg.geojsons) {
                            selectionLayers.push(createGeoJsonLayer(geojson));
                        }

                        // const slider = new Slider({
                        //     container: "sliderDiv",
                        //     min: 0,
                        //     max: 100,
                        //     values: [50],
                        //     snapOnClickEnabled: false,
                        //     visibleElements: {
                        //         labels: true,
                        //         rangeLabels: true
                        //     }
                        // });

                        // sceneView.ui.add(slider, "bottom-right");
                    }
                } catch (err) {
                    console.error(err);
                }
            });


        });

        el.appendChild(div);


        // function fullScreen() {
        //     if (document.fullscreenElement) {
        //         document.exitFullscreen();
        //     } else {
        //         div.requestFullscreen();
        //     }
        // }
        // const full = document.createElement("button");
        // full.innerHTML = "fullscreen";
        // full.addEventListener("click", fullScreen, false);
        // div.appendChild(full);

    } catch (err) {
        console.error(err);
    }
}

export default { render };