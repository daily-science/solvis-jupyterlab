const viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    homeButton: true,
    geocoder: false,
    fullscreenButton: true,
    fullscreenElement: "cesiumContainer",
    timeline: false,
    // large negative value to render deep underground structures
    depthPlaneEllipsoidOffset: -50000.0,
});

viewer.scene.globe.translucency.enabled = true;
viewer.scene.pickTranslucentDepth = true;

const toLatLonString = function (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(
        cartesian
    );



    const longitudeString = Cesium.Math.toDegrees(
        cartographic.longitude
    ).toFixed(2);
    const latitudeString = Cesium.Math.toDegrees(
        cartographic.latitude
    ).toFixed(2);
    const heightString = cartographic.height.toFixed(2);

    return " " + latitudeString + "," + longitudeString + ", " + heightString;
};


console.log(viewer.scene.globe.translucency);

viewer.scene.globe.translucency.frontFaceAlphaByDistance = new Cesium.NearFarScalar(
    400.0,
    0.6,
    800.0,
    0.6
);

viewer.scene.globe.translucency.frontFaceAlphaByDistance.nearValue = 0.4;


viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
});
viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
    function (e) {
        e.cancel = true;
        viewer.scene.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(175.57716369628906, -41.35120773, 95000),
        });
    }
);
viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
viewer.scene.screenSpaceCameraController.enableTranslate = false;
viewer.scene.screenSpaceCameraController.enableZoom = false;
viewer.scene.screenSpaceCameraController.enableRotate = false;
viewer.scene.screenSpaceCameraController.enableTilt = false;
viewer.scene.screenSpaceCameraController.enableLook = false;

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

var pickedPosition;
var pickedCartographic;
var startPosition;
var startDirection;
var startUp;
var startMousePosition;

handler.setInputAction(function (movement) {

    console.log("------------------------------");

    //    console.log(viewer.scene.pickPositionSupported);
    console.log(movement);
    //    console.log(movement.endPosition);

    const thePosition = movement.position;


    const ray = viewer.camera.getPickRay(thePosition);

    const picked = viewer.scene.pickFromRay(ray);
    console.log(picked);

    if (picked && picked.object) {

        pickedPosition = picked.position;


        const cartesian = viewer.scene.pickPosition(thePosition);
        console.log("cartesian " + cartesian);
        if (Cesium.defined(cartesian)) {

            console.log(toLatLonString(cartesian));
        }

        console.log("picked position: " + picked.position);
        const cartographic = Cesium.Cartographic.fromCartesian(
            picked.position
        );
        console.log(toLatLonString(picked.position));
        pickedCartographic = cartographic.clone();

        viewer.entities.add({
            position: picked.position,
            ellipsoid: {
                radii: new Cesium.Cartesian3(200.0, 200.0, 200.0),
                material: Cesium.Color.RED,
            },
        });
        console.log("camera direction: " + viewer.scene.camera.direction);
        console.log("camera position: " + viewer.scene.camera.position);

        startMousePosition = movement.position;
        startPosition = viewer.scene.camera.position.clone();
        startDirection = viewer.scene.camera.direction.clone();
        startUp = viewer.scene.camera.up.clone();


        // const heading = 0;
        // const pitch = Cesium.Math.PI / 20;
        // const roll = 0.0;
        // const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

        // const rotationMatrix = Cesium.Matrix3.fromHeadingPitchRoll(hpr);

        // const a = new Cesium.Cartesian3();
        // const b = new Cesium.Cartesian3();

        // Cesium.Cartesian3.subtract(viewer.scene.camera.position, picked.position, a);
        // Cesium.Matrix3.multiplyByVector(rotationMatrix, a, b);
        // Cesium.Cartesian3.add(b, picked.position, a);

        // viewer.scene.camera.position = a;

        // const c = new Cesium.Cartesian3();
        // const d = new Cesium.Cartesian3();
        // const e = new Cesium.Cartesian3();

        // Cesium.Matrix3.multiplyByVector(rotationMatrix, viewer.scene.camera.direction, c);

        // viewer.scene.camera.direction = c;

        // console.log("camera direction: " + viewer.scene.camera.direction);
        // console.log("camera position: " + viewer.scene.camera.position);


        // const transform = Cesium.Transforms.eastNorthUpToFixedFrame(picked.position);
        // const camera = viewer.camera;
        // camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
        // camera.lookAtTransform(
        //     transform,
        //     new Cesium.Cartesian3(1200.0, -1200.0, 120000.0)
        // );

        return;
        /*
        const heading = 0;
        const pitch = 0;//Cesium.Math.PI_OVER_FOUR;
        const roll = 0.0;
        const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
        const rotation = Cesium.Transforms.headingPitchRollToFixedFrame(picked.position, hpr);

        const a = new Cesium.Cartesian3();
        const b = new Cesium.Cartesian3();
        
        // Cesium.Cartesian3.subtract(viewer.scene.camera.position, picked.position, a);
        // Cesium.Matrix4.multiplyByPoint(rotation, a, b);
        //  Cesium.Cartesian3.add(b, picked.position, a);
        
        //  viewer.scene.camera.position = a;
        
        Cesium.Cartesian3.subtract(viewer.scene.camera.position, picked.position, a);
        Cesium.Matrix4.multiplyByPointAsVector(rotation, a, b);
        Cesium.Cartesian3.add(b, picked.position, a);

        viewer.scene.camera.position = a;

        const c = new Cesium.Cartesian3();
        const d = new Cesium.Cartesian3();
        Cesium.Cartesian3.subtract(viewer.scene.camera.direction, picked.position, c);
        Cesium.Matrix4.multiplyByPointAsVector(rotation, c, d);
        Cesium.Cartesian3.add(d, picked.position, c);

        viewer.scene.camera.direction = c;


        console.log("new camera dir: " + a);
        console.log("new camera pos: " + b);
*/

    }

    //    console.log(picked);





}, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

handler.setInputAction(function (movement) {

    if (!pickedPosition) {
        return;
    }
    //    console.log(viewer.scene.pickPositionSupported);
    //    console.log(movement);
    //    console.log(movement.endPosition);

    const thePosition = movement.endPosition;
    //  console.log("Y movement: "+ (movement.startPosition.y - movement.endPosition.y));

    //        console.log("camera direction: " + viewer.scene.camera.direction);
    //      console.log("camera position: " + viewer.scene.camera.position);

    const lat = Cesium.Math.PI * 1.5 - pickedCartographic.latitude;
    const lon = pickedCartographic.longitude;

    // console.log("pickedCartographic: " + pickedCartographic);

    const startHpr = new Cesium.HeadingPitchRoll(lon, lat, 0);
    //const endHpr = new Cesium.HeadingPitchRoll(-lon, -lat, 0);
    const startRot = Cesium.Matrix3.fromHeadingPitchRoll(startHpr);
    const endRot = Cesium.Matrix3.inverse(startRot, new Cesium.Matrix3());// Cesium.Matrix3.fromHeadingPitchRoll(endHpr);


    const heading = 0.0;
    const pitch = (Cesium.Math.PI / 360) * -(startMousePosition.y - movement.endPosition.y);
    const roll = -(Cesium.Math.PI / 360) * (startMousePosition.x - movement.endPosition.x);
    const hprPitch = new Cesium.HeadingPitchRoll(0, pitch, 0);
    const hprRoll = new Cesium.HeadingPitchRoll(0, 0, roll);

    //  console.log("pitch: " + pitch);

    const simpleRotationMatrixPitch = Cesium.Matrix3.fromHeadingPitchRoll(hprPitch);
    const simpleRotationMatrixRoll = Cesium.Matrix3.fromHeadingPitchRoll(hprRoll);

    const a = new Cesium.Cartesian3();
    const b = new Cesium.Cartesian3();

    // console.log("startRot: " + startRot);
    // console.log("endRot: " + endRot);
    // console.log("simpleRotationMatrix: " + simpleRotationMatrix);

    Cesium.Cartesian3.subtract(startPosition, pickedPosition, a);
    Cesium.Matrix3.multiplyByVector(endRot, a, b);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixPitch, b, a);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixRoll, a, b);
    Cesium.Matrix3.multiplyByVector(startRot, b, a);
    Cesium.Cartesian3.add(a, pickedPosition, b);
    viewer.scene.camera.position = b;

    const c = new Cesium.Cartesian3();
    const d = new Cesium.Cartesian3();

    // console.log(startDirection);

    Cesium.Matrix3.multiplyByVector(endRot, startDirection, c);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixPitch, c, d);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixRoll, d, c);
    Cesium.Matrix3.multiplyByVector(startRot, c, d);
    viewer.scene.camera.direction = d;

    const e = new Cesium.Cartesian3();
    const f = new Cesium.Cartesian3();

    Cesium.Matrix3.multiplyByVector(endRot, startUp, e);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixPitch, e, f);
    Cesium.Matrix3.multiplyByVector(simpleRotationMatrixRoll, f, e);
    Cesium.Matrix3.multiplyByVector(startRot, e, f);
    viewer.scene.camera.up = f;

    // console.log("new camera direction: " + viewer.scene.camera.direction);
    // console.log("new camera position: " + viewer.scene.camera.position);


    // const transform = Cesium.Transforms.eastNorthUpToFixedFrame(picked.position);
    // const camera = viewer.camera;
    // camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
    // camera.lookAtTransform(
    //     transform,
    //     new Cesium.Cartesian3(1200.0, -1200.0, 120000.0)
    // );

    return;
    /*
    const heading = 0;
    const pitch = 0;//Cesium.Math.PI_OVER_FOUR;
    const roll = 0.0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const rotation = Cesium.Transforms.headingPitchRollToFixedFrame(picked.position, hpr);

    const a = new Cesium.Cartesian3();
    const b = new Cesium.Cartesian3();
    
    // Cesium.Cartesian3.subtract(viewer.scene.camera.position, picked.position, a);
    // Cesium.Matrix4.multiplyByPoint(rotation, a, b);
    //  Cesium.Cartesian3.add(b, picked.position, a);
    
    //  viewer.scene.camera.position = a;
    
    Cesium.Cartesian3.subtract(viewer.scene.camera.position, picked.position, a);
    Cesium.Matrix4.multiplyByPointAsVector(rotation, a, b);
    Cesium.Cartesian3.add(b, picked.position, a);

    viewer.scene.camera.position = a;

    const c = new Cesium.Cartesian3();
    const d = new Cesium.Cartesian3();
    Cesium.Cartesian3.subtract(viewer.scene.camera.direction, picked.position, c);
    Cesium.Matrix4.multiplyByPointAsVector(rotation, c, d);
    Cesium.Cartesian3.add(d, picked.position, c);

    viewer.scene.camera.direction = c;


    console.log("new camera dir: " + a);
    console.log("new camera pos: " + b);
*/

}

    //    console.log(picked);





    , Cesium.ScreenSpaceEventType.MOUSE_MOVE);


handler.setInputAction(function (movement) {
    pickedPosition = undefined;
}, Cesium.ScreenSpaceEventType.RIGHT_UP);


//    viewer.scene.screenSpaceCameraController.minimumZoomDistance = -20000;
//    viewer.scene.screenSpaceCameraController.minimumZoomRate = 350;


const geojson =
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "FaultID": 2275,
                "FaultName": "Hikurangi, Kermadec to Louisville ridge, 30km - with slip deficit smoothed near East Cape and locked near trench.; col: 8, row: 3",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [
                            175.57716369628906,
                            -41.351207733154304,
                            -15000
                        ],
                        [
                            175.28581332609434,
                            -41.197177112993316,
                            -19000
                        ],
                        [
                            175.07787049233667,
                            -41.417877374920316,
                            -19000
                        ],
                        [
                            175.37020874023438,
                            -41.5719108581543,
                            -15000
                        ],
                        [
                            175.57716369628906,
                            -41.351207733154304,
                            -15000
                        ]
                    ]
                ]
            }
        },]
};


viewer.dataSources.add(Cesium.GeoJsonDataSource.load(geojson));