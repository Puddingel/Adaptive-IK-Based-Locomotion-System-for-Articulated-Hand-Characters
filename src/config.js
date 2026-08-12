export default {
    character: {
        walkSpeed: 0.01,
        runSpeed:  0.03,
        gravity:    9.81,
        jumpHeight: 1.15,

        jumpAnticipationDuration: 0.4,
        jumpAnticipationDepth:    0.12,
        landingSquashDuration:    0.5,
        landingSquashDepth:       0.02,
    },
    camera: {
        scrollSpeed:      0.1,
        startRadius:      2.0,
        minDistance:      0.1,
        maxDistance:      10.0,
        rotateSpeed:      0.005,
        keyRotateSpeed:   0.02,
        orbitYOffset:     0.3,
        startPhi:         Math.PI / 4,

        nearFactor:       0.01,
        farFactor:        100,
        startHeightFactor: 1.0,
        startDepthFactor:  1.5,
    },
    hand: {
        pivotYOffset: 0.3,
        scale: 10,
    },
    ik: {
        sphereSize:   0.001,
        showTargets:  false,
        manualTargets: false,
    },
    footPlacement: {
        penetrationCorrection: true,
        stepThreshold:    0.02,
        maxPlantDistance: 0.75,
        stepHeight:       0.4,
        restLookAhead:       0,
        palmHeightOffset:    0,
        palmHeightSmoothing: 0.08,
        stepDuration: {
            idle: 0.2,
            walk: 0.5,
            run:  0.5,
        },
        restOffsets: {
            index:  { x:  0.25, z: 1.7 },
            middle: { x:  -0.07, z: 1.7 },
            ring:   { x: -0.37, z: 1.7 },
            little: { x: -0.88, z: 1.7 },
        }
    },
    noise: {
        enabled: true,
        breathing: {
            speed: 0.2,
            pivotAmplitude: 0.003,
            wristAmplitude: 0.00,
            palmAmplitude: 0.025,
            movementMultiplier: 3,
            movementHeight: 0.3,
        },
        thumb: {
            speed: 0.1,
            amplitude: 0.003,
        },
    },
    ccdsolver: {
        maxIterations: 10,
        threshold: 0.005,
        disableConstraints: false,
    },
    threejs: {
        disableSunLightCameraHelperVisibility: true,
    }
}