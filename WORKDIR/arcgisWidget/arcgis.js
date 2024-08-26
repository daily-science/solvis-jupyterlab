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

function getAllGeoJSONProperties(geojson, field) {
    const values = geojson.features.map(feature => {
        const properties = feature.properties;
        return properties[field];
    });
    return [... new Set(values)];
}

function makeSymbol(geometryType) {
    if (geometryType === "Polygon") {
        return {
            type: "polygon-3d",
            symbolLayers: [{
                type: 'fill',
                material: { color: [0, 0, 242, 0.5] },
            }]
        };
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

function makeColorRenderer(field, geometryType, colors) {
    const symbolType = geometryType === "Polygon" ? "simple-fill" : "simple-line";
    const result = {
        type: "unique-value",
        "field": field,
        defaultSymbol: { type: symbolType, "color": "black" },
        uniqueValueInfos: colors.map(color => {
            return {
                value: color,
                symbol: {
                    type: symbolType,
                    "color": color
                }
            }
        })
    };
    return result;
}

function render({ model, el }) {

    try {
        const containerDiv = document.createElement("div");
        containerDiv.id = "oakley's div";
        containerDiv.style.width = model.get("width");
        containerDiv.style.height = model.get("height");
        const div = document.createElement("div");
        div.classList.add("arcGisMapContainer");

        require([
            "esri/views/SceneView",
            "esri/Map",
            "esri/Camera",
            "esri/layers/GeoJSONLayer",
            "esri/renderers/SimpleRenderer",
            "esri/symbols/PolygonSymbol3D",
            "esri/widgets/Slider",
            "esri/widgets/Home",
            "esri/widgets/Fullscreen",
            "esri/core/reactiveUtils",
        ], (
            SceneView,
            Map,
            Camera,
            GeoJSONLayer,
            SimpleRenderer,
            PolygonSymbol3D,
            Slider,
            Home,
            Fullscreen,
            reactiveUtils,
        ) => {

            console.log("render map");
            console.log(model);
            const initialViewParams = {
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
            if (model.get("_camera") && Object.keys(model.get("_camera")).length > 0) {
                initialViewParams.camera = Camera.fromJSON(model.get("_camera"));
            } else {
                initialViewParams.zoom = 7;
                initialViewParams.center = [174.777, -41.288];
            }
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


            const createSceneRenderer = (geometryType, geojson) => {

                // FIXME: handle points, etc
                const fieldName = geometryType === "Polygon" ? "fill" : "stroke";

                const colors = getAllGeoJSONProperties(geojson, fieldName);

                console.log("colors");
                console.log(colors);

                return makeColorRenderer(fieldName, geometryType, colors);

            };

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

                const renderer = createSceneRenderer(geojson.features[0].geometry.type, geojson);

                const layer = new GeoJSONLayer({
                    url,
                    elevationInfo: { mode: "absolute-height" },
                    hasZ: true,
                    renderer: renderer,
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
                visible: false,
                snapOnClickEnabled: true,
                steps: 1,
                visibleElements: {
                    labels: true,
                    rangeLabels: true,
                }
            });

            var currentSelectionIndex = model.get("selection");


            function sliderChangeHandler(event) {
                if (slider.values[0] - 1 !== currentSelectionIndex) {
                    scene.remove(selectionLayers[currentSelectionIndex]);
                }
                currentSelectionIndex = slider.values[0] - 1;
                if (selectionLayers.length > currentSelectionIndex) {
                    scene.add(selectionLayers[currentSelectionIndex]);
                }
                model.set("selection", currentSelectionIndex);
                model.save_changes();
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

            function dataChange() {
                console.log("dataChange");
                const newData = model.get("data");
                if (newData.length > selectionLayers.length) {
                    for (var i = selectionLayers.length; i < newData.length; i++) {
                        const layer = createGeoJsonLayer(newData[i]);
                        selectionLayers.push(layer);
                    }
                    if (selectionLayers.length > currentSelectionIndex) {
                        scene.add(selectionLayers[currentSelectionIndex]);
                    }

                    if (selectionLayers.length > 1) {
                        sceneView.ui.add(slider, "bottom-right");
                        slider.values = [model.get("selection") + 1];
                        slider.max = selectionLayers.length;
                        slider.disabled = false;
                        slider.visible = true;
                        sliderForward.style.display = "block";
                        sliderBack.style.display = "block";
                    }

                }
            }


            model.on("change:data", dataChange);

            containerDiv.appendChild(div);
            el.appendChild(containerDiv);


            dataChange();

            //slider.values=[currentSelectionIndex];
            //   sliderChangeHandler();

            reactiveUtils.when(() => sceneView.stationary === true, () => {
                if (sceneView.camera) {
                    const camera = sceneView.camera.toJSON();
                    model.set("_camera", camera);
                    model.save_changes();
                }
            });

            sceneView.on("click", (event) => {
                console.log(event);
                sceneView.hitTest(event).then(({ results }) => {
                    console.log(results);
                  });
            });

        });


    } catch (err) {
        console.error(err);
    }
}

export default { render };