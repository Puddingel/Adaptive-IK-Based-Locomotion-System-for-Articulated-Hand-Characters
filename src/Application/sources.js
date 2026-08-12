export default [
    {
        name: 'environmentMapTexture',
        type: 'cubeTexture',
        path:
        [
            'textures/environmentMap/px.jpg',
            'textures/environmentMap/nx.jpg',
            'textures/environmentMap/py.jpg',
            'textures/environmentMap/ny.jpg',
            'textures/environmentMap/pz.jpg',
            'textures/environmentMap/nz.jpg',
        ]
    },
    {
        name: 'handTexture',
        type: 'texture',
        path: 'textures/hand/hand_diffuse.png'
    },
    {
        name: 'handNormal',
        type: 'texture',
        path: 'textures/hand/hand_normal.png'
    },
    {
        name: 'handRoughness',
        type: 'texture',
        path: 'textures/hand/hand_roughness.png'
    },
    {
        name: 'handModel',
        type: 'gltfModel',
        path: 'models/Hand/handModel.glb'
    },
    {
        name: 'roomModel',
        type: 'gltfModel',
        path: 'models/Room/Room.glb'
    }
]