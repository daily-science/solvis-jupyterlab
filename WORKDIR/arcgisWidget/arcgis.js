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

            const data = model.get("data");
            var currentSelectionIndex = Math.min(model.get("selection"), data.length - 1);


            // create 3D layers -----------------------------------------------------------------

            console.log("3D layers");

            const createSceneRenderer = (geometryType, geojson) => {
                // FIXME: handle points, etc
                const fieldName = geometryType === "Polygon" ? "fill" : "stroke";
                const colors = getAllGeoJSONProperties(geojson, fieldName);
                return makeColorRenderer(fieldName, geometryType, colors);

            };

            const template = {
                title: "Section or Patch",
                content: "<ul><li>fault id: {FaultID}</li><li>patch id: {patch_id}</li><li> fault name: {FaultName}</li></ul>",
            };

            function createGeoJsonLayer(geojson) {

                const objectExtent = {
                    minLat: Number.MAX_SAFE_INTEGER,
                    maxLat: Number.MIN_SAFE_INTEGER,
                    minLon: Number.MAX_SAFE_INTEGER,
                    maxLon: Number.MIN_SAFE_INTEGER,
                    minEle: Number.MAX_SAFE_INTEGER,
                    maxEle: Number.MIN_SAFE_INTEGER,
                    add([longitude, latitude, elevation]) {
                        this.minLon = Math.min(this.minLon, longitude);
                        this.maxLon = Math.max(this.maxLon, longitude);
                        this.minLat = Math.min(this.minLat, latitude);
                        this.maxLat = Math.max(this.maxLat, latitude);
                        this.minEle = Math.min(this.minEle, elevation);
                        this.maxEle = Math.max(this.maxEle, elevation);
                    },
                    center() {
                        return [
                            this.minLon + ((this.maxLon - this.minLon) / 2),
                            this.minLat + ((this.maxLat - this.minLat) / 2),
                            this.minEle + ((this.maxEle - this.minEle) / 2),
                        ];
                    }
                }

                //arcgis expects elevation in meters
                for (const feature of geojson.features) {
                    if (feature.geometry.type === 'Polygon') {
                        const coords = feature.geometry.coordinates[0];
                        for (var i = 0; i < coords.length; i++) {
                            const [lon, lat, ele] = coords[i];
                            const newCoord = [lon, lat, ele * -1000];
                            coords[i] = newCoord;
                            objectExtent.add(newCoord);
                        }
                    }
                    if (feature.geometry.type === 'LineString') {
                        const coords = feature.geometry.coordinates;
                        for (var i = 0; i < coords.length; i++) {
                            const [lon, lat, ele] = coords[i];
                            const newCoord = [lon, lat, ele * -1000];
                            coords[i] = newCoord;
                            objectExtent.add(newCoord);
                        }
                    }
                }

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
                    visible: false,
                });
                layer.extentCenter = objectExtent.center();
                return layer;
            }

            const selectionLayers = [];
            for (const layer of data) {
                selectionLayers.push(createGeoJsonLayer(layer));
            }

            // create map -----------------------------------------------------------------

            console.log("create map");

            const initialViewParams = {
                container: div,
                environment: {
                    background: {
                        type: "color",
                        color: "white"
                    },
                    starsEnabled: false,
                    atmosphereEnabled: false
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
                const index = currentSelectionIndex === -1 ? 0 : currentSelectionIndex;
                initialViewParams.center = selectionLayers[index]?.extentCenter || [174.777, -41.288];
            }
            initialViewParams.container = null;
            initialViewParams.map = scene;
            const sceneView = new SceneView(initialViewParams);
            sceneView.container = div;

            for (var layer of selectionLayers) {
                scene.add(layer);
            }

            if (currentSelectionIndex !== -1) {
                selectionLayers[currentSelectionIndex].visible = true;
            } else {
                for (const layer of selectionLayers) {
                    layer.visible = true;
                }
            }
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

            function sliderChangeHandler(event) {
                if (slider.values[0] - 1 !== currentSelectionIndex) {
                    selectionLayers[currentSelectionIndex].visible = false;
                    currentSelectionIndex = slider.values[0] - 1;
                    selectionLayers[currentSelectionIndex].visible = true;

                    sceneView.goTo({ center: selectionLayers[currentSelectionIndex].extentCenter.slice(0, 2) }, { animate: true })
                        .catch(function (error) {
                            console.error(error);
                        });

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

            if (selectionLayers.length > 1 && currentSelectionIndex !== -1) {
                sceneView.ui.add(slider, "bottom-right");
                slider.values = [currentSelectionIndex + 1];
                slider.max = selectionLayers.length;
                slider.disabled = false;
                slider.visible = true;
                sliderForward.style.display = "block";
                sliderBack.style.display = "block";
            }


            const showGlobeButton = document.createElement("div");
            showGlobeButton.classList.add("fa");
            showGlobeButton.classList.add("fa-globe");
            showGlobeButton.classList.add("sliderControlButton");
            sceneView.ui.add(showGlobeButton, "top-right");
            showGlobeButton.style.display = "block";

            showGlobeButton.addEventListener("click", function (event) {
                if (scene.ground.opacity > 0.7) {
                    scene.ground.opacity = 0;
                } else {
                    scene.ground.opacity = 0.8
                }
            });

            containerDiv.appendChild(div);
            el.appendChild(containerDiv);

            reactiveUtils.when(() => sceneView.stationary === true, () => {
                if (sceneView.camera) {
                    const camera = sceneView.camera.toJSON();
                    model.set("_camera", camera);
                    model.save_changes();
                }
            });

            var dragPos;
            var dragHeading;
            var dragTilt;

            sceneView.on("drag", (event) => {
                if (event.button != 2) {
                    return;
                }

                if (event.action === "start") {
                    sceneView.hitTest(event).then(({ results }) => {
                        if (results.length > 0) {
                            dragPos = results[0].mapPoint.clone();
                        } else {
                            dragPos = sceneView.center.clone();
                        }
                        dragHeading = sceneView.camera.heading;
                        dragTilt = sceneView.camera.tilt;

                    });
                    event.stopPropagation();

                }

                if (!dragPos) {
                    return;
                }

                if (event.action === "update") {
                    event.stopPropagation();
                    sceneView.goTo(
                        {
                            center: dragPos.clone(),
                            heading: (dragHeading - (event.origin.x - event.x)) % 360,
                            tilt: (dragTilt + (event.origin.y - event.y)) % 360
                        }, { animate: false })
                        .catch(function (error) {
                            console.error(error);
                        });

                }

                if (event.action === "end") {
                    dragPos = undefined;
                }
            });

        });


    } catch (err) {
        console.error(err);
    }
}

export default { render };