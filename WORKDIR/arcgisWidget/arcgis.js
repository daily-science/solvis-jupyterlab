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
        const containerDiv = document.createElement("div");
        containerDiv.id = "oakley's div";
        containerDiv.style.width = model.get("width");
        containerDiv.style.height = model.get("height");
        const div = document.createElement("div");
        div.classList.add("arcGisMapContainer");

        const geojson = model.get("geojson");

        require([
            "esri/views/SceneView",
            "esri/Map",
            "esri/layers/GeoJSONLayer",
            "esri/renderers/SimpleRenderer",
            "esri/symbols/PolygonSymbol3D",
            "esri/widgets/Slider",
            "esri/widgets/Home",
            "esri/widgets/Fullscreen",
        ], (
            SceneView,
            Map,
            GeoJSONLayer,
            SimpleRenderer,
            PolygonSymbol3D,
            Slider,
            Home,
            Fullscreen,
        ) => {

            console.log("render map");
            const initialViewParams = {
                zoom: 7,
                center: [174.777, -41.288],
                container: div,
                environment: {
                    background: {
                        type: "color",
                        color: [0, 0, 0, 0]
                    },
                    starsEnabled: false,
                    atmosphereEnabled: true
                }
            };

            const scene = new Map({
                basemap: "gray-vector", ground: {
                    navigationConstraint: "none",
                    opacity: 0.8
                },
            });

            initialViewParams.container = null;
            initialViewParams.map = scene;
            const sceneView = new SceneView(initialViewParams);
            sceneView.container = div;
            // console.log(sceneView.constraints.clipDistance);

            // sceneView.constraints.clipDistance.watch("near", function (newValue, oldValue, propertyName, target) {
            //     console.log(propertyName + " changed from " + oldValue + " to " + newValue);
            // });

            sceneView.constraints.clipDistance.watch("far", function (newValue, oldValue, propertyName, target) {
                if (newValue < 6587860) {
                    target.far = 16587860;
                    console.log(target);
                    console.log(propertyName + " changed from " + oldValue + " to " + newValue);
                }
            });

            const homeBtn = new Home({
                view: sceneView
            });

            // Add the home button to the top left corner of the view
            sceneView.ui.add(homeBtn, "top-left");

            const fullscreen = new Fullscreen({
                //view: sceneView
                element: div
            });
            sceneView.ui.add(fullscreen, "top-right");

            //sceneView.constraints.clipDistance.near = 1e-8;
            //    sceneView.constraints.clipDistance.far =1e9;
            // sceneView.constraints.clipDistance.mode ="manual";


            // prevent jupyterlab from popping up the context menu
            div.addEventListener("contextmenu", function (ev) {
                ev.stopPropagation();
            })

            function makeSymbol(geometryType) {
                if (geometryType === "Polygon") {
                    return new PolygonSymbol3D({
                        symbolLayers: [{
                            type: 'fill',
                            material: { color: [0, 0, 242, 0.5] },
                        }]
                    });
                }
                if (geometryType === "LineString") {
                    return {
                        type: "line-3d",
                        symbolLayers: [{
                            type: 'line',
                            size: 1,
                            material: { color: [0, 0, 242, 0.5] },
                        }]
                    };
                }
            }

            const createSceneRenderer = (geometryType) => new SimpleRenderer({
                symbol: makeSymbol(geometryType)
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
                    if (feature.geometry.type === 'LineString') {
                        const coords = feature.geometry.coordinates;
                        for (var i = 0; i < coords.length; i++) {
                            const [lon, lat, ele] = coords[i];
                            coords[i] = [lon, lat, ele * -1000];
                        }
                    }
                }

                //                console.log(geojson);

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
                    renderer: createSceneRenderer(geojson.features[0].geometry.type),
                    popupTemplate: template,
                });
                return layer;
            }

            const selectionLayers = [];

            const sliderDiv = document.createElement("div");
            document.body.appendChild(sliderDiv);
            sliderDiv.style = "width:300px";

            const slider = new Slider({
                container: sliderDiv,
                min: 1,
                max: 2,
                values: [1],
                disabled: true,
                snapOnClickEnabled: true,
                steps: 1,
                visibleElements: {
                    labels: true,
                    rangeLabels: true,
                }
            });

            var currentSelectionIndex = 1;

            function sliderChangeHandler(event) {
                if (slider.values[0] !== currentSelectionIndex) {
                    scene.remove(selectionLayers[currentSelectionIndex - 1]);
                }
                currentSelectionIndex = slider.values[0];
                scene.add(selectionLayers[currentSelectionIndex - 1]);
            }

            slider.on(["thumb-click", "thumb-drag", "thumb-change", "track-click"], sliderChangeHandler);

            const sliderForward = document.createElement("div");
            sliderForward.classList.add("fa");
            sliderForward.classList.add("fa-forward");
            sliderForward.classList.add("sliderControlButton");
            sceneView.ui.add(sliderForward, "bottom-right");
            const sliderBack = document.createElement("div");
            sliderBack.classList.add("fa");
            sliderBack.classList.add("fa-backward");
            sliderBack.classList.add("sliderControlButton");
            sceneView.ui.add(sliderBack, "bottom-right");

            sliderForward.addEventListener("click", function (event) {
                if (slider.max > slider.values[0]) {
                    slider.values = [slider.values[0] + 1];
                    sliderChangeHandler();
                }
            });
            sliderBack.addEventListener("click", function (event) {
                if (slider.min < slider.values[0]) {
                    slider.values = [slider.values[0] - 1];
                    sliderChangeHandler();
                }
            });


            model.on("msg:custom", (msg) => {
                try {
                    if (msg?.geojson) {
                        const layer = createGeoJsonLayer(msg.geojson);
                        scene.add(layer);
                    } else if (msg?.selection) {
                        selectionLayers.push(createGeoJsonLayer(msg.selection));
                        if (selectionLayers.length == 1) {
                            scene.add(selectionLayers[0]);
                            sceneView.ui.add(slider, "bottom-right");
                        } else {
                            slider.max = selectionLayers.length;
                            slider.disabled = false;
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

        containerDiv.appendChild(div);
        el.appendChild(containerDiv);
        ;
    } catch (err) {
        console.error(err);
    }
}

export default { render };