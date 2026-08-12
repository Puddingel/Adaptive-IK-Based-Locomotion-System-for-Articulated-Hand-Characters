const PHI = (1 + Math.sqrt(5)) / 2

export default class ProceduralNoise
{
    constructor()
    {
        this.channels = {}
    }

    add(name, { octaves = 3, persistence = 0.5, seed = 0 } = {})
    {
        let normalization = 0
        let amp = 1
        for(let i = 0; i < octaves; i++)
        {
            normalization += amp
            amp *= persistence
        }

        this.channels[name] = { octaves, persistence, seed, normalization }
    }

    sample(name, time, speed = 1)
    {
        const ch = this.channels[name]
        let value = 0
        let amp = 1
        let freq = speed

        for(let i = 0; i < ch.octaves; i++)
        {
            value += amp * Math.sin(2 * Math.PI * freq * time + ch.seed + i * 1.7)
            amp *= ch.persistence
            freq *= PHI
        }

        return value / ch.normalization
    }
}
