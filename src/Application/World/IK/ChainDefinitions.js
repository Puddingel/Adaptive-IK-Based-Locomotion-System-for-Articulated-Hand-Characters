const PI = Math.PI
const deg = (d) => d * PI / 180

export default [
    {
        name: 'index',
        bones: ['indexFingerMCP', 'indexFingerPIP', 'indexFingerDIP'],
        effector: 'indexFingerEffector',
        couplingRatio: 0.77,
        constraints: [
            { x: { min: deg(-40), max: deg(90) },    y: { min: 0, max: 0 }, z: { min: deg(-20), max: deg(20) } }, // MCP
            { x: { min: 0, max: deg(100) }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }, // PIP
            { x: { min: deg(-5), max: deg(75) },    y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }  // DIP
        ]
    },
    {
        name: 'middle',
        bones: ['middleFingerMCP', 'middleFingerPIP', 'middleFingerDIP'],
        effector: 'middleFingerEffector',
        couplingRatio: 0.75,
        constraints: [
            { x: { min: deg(-40), max: deg(90) },    y: { min: 0, max: 0 }, z: { min: deg(-10), max: deg(10) } }, // MCP
            { x: { min: 0, max: deg(110) }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }, // PIP
            { x: { min: deg(-5), max: deg(80) },    y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }  // DIP
        ]
    },
    {
        name: 'ring',
        bones: ['ringFingerMCP', 'ringFingerPIP', 'ringFingerDIP'],
        effector: 'ringFingerEffector',
        couplingRatio: 0.75,
        constraints: [
            { x: { min: deg(-40), max: deg(90) },    y: { min: 0, max: 0 }, z: { min: deg(-10), max: deg(10) } }, // MCP
            { x: { min: 0, max: deg(120) }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }, // PIP
            { x: { min: deg(-5), max: deg(85) },    y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }  // DIP
        ]
    },
    {
        name: 'little',
        bones: ['littleFingerMCP', 'littleFingerPIP', 'littleFingerDIP'],
        effector: 'littleFingerEffector',
        couplingRatio: 0.57,
        constraints: [
            { x: { min: deg(-40), max: deg(90) },    y: { min: 0, max: 0 }, z: { min: deg(-10), max: deg(15) } }, // MCP
            { x: { min: 0, max: deg(135) }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }, // PIP
            { x: { min: deg(-5), max: deg(90) },    y: { min: 0, max: 0 }, z: { min: 0, max: 0 } }  // DIP
        ]
    },
    {
        name: 'thumb',
        bones: ['thumbMCP', 'thumbPIP', 'thumbDIP'],
        effector: 'thumbEffector',
        couplingRatio: null,
        constraints: [
            { x: { min: deg(-45), max: deg(45) }, y: { min: deg(-15), max: deg(-15) }, z: { min: deg(-60), max: deg(60)} }, // MCP — saddle joint, Y locked to -25° for natural thumb rotation
            { x: { min: 0, max: deg(100) },    y: { min: 0, max: 0 },             z: { min: 0, max: 0 } },            // PIP
            { x: { min: 0, max: deg(80) },    y: { min: 0, max: 0 },             z: { min: 0, max: 0 } }             // DIP
        ]
    }
]