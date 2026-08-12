import * as THREE from 'three'
import Application from './Application.js'
import config from '../config.js'

const ALL_CHAINS = ['index', 'middle', 'ring', 'little', 'thumb']
const WALKING_FINGERS = ['index', 'middle', 'ring', 'little']

export default class Testing
{
    constructor()
    {
        this.application = new Application()
        this.time = this.application.time
        this.debug = this.application.debug

        this.hand = null
        this.characterController = null
        this.isReady = false

        this.isRecording = false
        this.samples = []
        this._recordingStart = 0

        this._prev = {}
        this._frameTimeBuffer = []

        this.live = {
            fps: 0,
            frameTimeMs: 0,
            avgEndEffectorError: 0,
            maxEndEffectorError: 0,
            ikSuccessRate: 100,
            avgFootSlip: 0,
            avgJerk: 0,
            avgPlacementError: 0,
            maxPenetrationDepth: 0,
            sampleCount: 0,
            duration: 0,
        }

        this.application.world.on('characterReady', (hand) =>
        {
            this.hand = hand
            this.characterController = this.application.characterController
            this.isReady = true
            this._initTracking()
        })

        if(this.debug.active)
            this._setupGUI()
    }

    _initTracking()
    {
        ALL_CHAINS.forEach(name =>
        {
            const effPos = new THREE.Vector3()
            this.hand.chains[name].effector.getWorldPosition(effPos)

            this._prev[name] = {
                position: effPos.clone(),
                velocity: new THREE.Vector3(),
                acceleration: new THREE.Vector3(),
                _wasPlanted: false,
            }
        })
    }

    update()
    {
        if(!this.isReady) return

        const dt = this.time.delta / 1000
        if(dt <= 0) return

        const sample = this._collectSample(dt)
        this._updateLive(sample)

        if(this.isRecording)
            this.samples.push(sample)
    }

    _collectSample(dt)
    {
        const sample = {
            timestamp: this.isRecording ? this.time.current - this._recordingStart : 0,
            frameTime: this.time.delta,
            fps: 1000 / this.time.delta,
            state: this.characterController.stateMachine.current,
            fingers: {},
            pivotPosition: new THREE.Vector3(),
        }

        this.hand.pivot.getWorldPosition(sample.pivotPosition)

        const fpc = this.hand.footPlacementController

        ALL_CHAINS.forEach(name =>
        {
            const chain = this.hand.chains[name]
            const solveResult = chain.lastSolveResult || { iterations: 0, error: 0, converged: true }

            const effPos = new THREE.Vector3()
            chain.effector.getWorldPosition(effPos)

            const targetPos = chain.target()
            const endEffectorError = effPos.distanceTo(targetPos)

            const prev = this._prev[name]

            const velocity = effPos.clone().sub(prev.position).divideScalar(dt)
            const acceleration = velocity.clone().sub(prev.velocity).divideScalar(dt)
            const jerk = acceleration.clone().sub(prev.acceleration).divideScalar(dt)

            const fingerData = {
                endEffectorError,
                ikIterations: solveResult.iterations,
                ikConverged: solveResult.converged,
                velocity: velocity.length(),
                acceleration: acceleration.length(),
                jerk: jerk.length(),
            }

            if(WALKING_FINGERS.includes(name))
            {
                const finger = fpc.fingers[name]
                const isPlanted = !finger.isLifted

                let footSlip = 0
                if(isPlanted && prev._wasPlanted)
                {
                    const dx = effPos.x - prev.position.x
                    const dz = effPos.z - prev.position.z
                    footSlip = Math.sqrt(dx * dx + dz * dz)
                }

                fingerData.isPlanted = isPlanted
                fingerData.footSlip = footSlip
                fingerData.placementError = finger.plantedPosition.distanceTo(finger.restPosition)
                fingerData.penetrationDepth = fpc._getBonePenetration(name, finger)
                prev._wasPlanted = isPlanted
            }

            prev.position.copy(effPos)
            prev.velocity.copy(velocity)
            prev.acceleration.copy(acceleration)

            sample.fingers[name] = fingerData
        })

        return sample
    }

    _updateLive(sample)
    {
        this._frameTimeBuffer.push(sample.frameTime)
        if(this._frameTimeBuffer.length > 60)
            this._frameTimeBuffer.shift()

        const avgFrameTime = this._frameTimeBuffer.reduce((s, v) => s + v, 0) / this._frameTimeBuffer.length

        this.live.fps = Math.round(1000 / avgFrameTime)
        this.live.frameTimeMs = +avgFrameTime.toFixed(2)

        let totalError = 0
        let maxError = 0
        let convergedCount = 0
        let totalFootSlip = 0
        let totalJerk = 0
        let totalPlacementError = 0
        let maxPenetration = 0
        let fingerCount = 0
        let walkingFingerCount = 0
        let walkingCount = 0

        ALL_CHAINS.forEach(name =>
        {
            const f = sample.fingers[name]
            totalError += f.endEffectorError
            maxError = Math.max(maxError, f.endEffectorError)
            if(name !== 'thumb')
            {
                if(f.ikConverged) convergedCount++
                walkingFingerCount++
            }
            totalJerk += f.jerk
            fingerCount++

            if(f.footSlip !== undefined)
            {
                totalFootSlip += f.footSlip
                totalPlacementError += f.placementError
                maxPenetration = Math.max(maxPenetration, f.penetrationDepth)
                walkingCount++
            }
        })

        this.live.avgEndEffectorError = +(totalError / fingerCount).toFixed(6)
        this.live.maxEndEffectorError = +maxError.toFixed(6)
        this.live.ikSuccessRate = walkingFingerCount > 0 ? +((convergedCount / walkingFingerCount) * 100).toFixed(1) : 0
        this.live.avgFootSlip = walkingCount > 0 ? +(totalFootSlip / walkingCount).toFixed(6) : 0
        this.live.avgJerk = +(totalJerk / fingerCount).toFixed(2)
        this.live.avgPlacementError = walkingCount > 0 ? +(totalPlacementError / walkingCount).toFixed(6) : 0
        this.live.maxPenetrationDepth = +maxPenetration.toFixed(6)

        if(this.isRecording)
        {
            this.live.sampleCount = this.samples.length
            this.live.duration = +((this.time.current - this._recordingStart) / 1000).toFixed(1)
        }
    }

    startRecording()
    {
        this.samples = []
        this._recordingStart = this.time.current
        this.isRecording = true
        this.live.sampleCount = 0
        this.live.duration = 0
        console.log('[Testing] Recording started')
    }

    stopRecording()
    {
        this.isRecording = false
        console.log(`[Testing] Recording stopped — ${this.samples.length} samples over ${this.live.duration}s`)
    }

    getReport()
    {
        if(this.samples.length === 0)
        {
            console.warn('[Testing] No samples recorded')
            return null
        }

        const n = this.samples.length
        const duration = (this.samples[n - 1].timestamp / 1000).toFixed(2)

        const frameTimes = this.samples.map(s => s.frameTime)
        const fpsValues = this.samples.map(s => s.fps)
        const ftStats = this._stats(frameTimes)
        const fpsStats = this._stats(fpsValues)

        const fingerStats = {}
        ALL_CHAINS.forEach(name =>
        {
            const errors = this.samples.map(s => s.fingers[name].endEffectorError)
            const iterations = this.samples.map(s => s.fingers[name].ikIterations)
            const convergedCount = this.samples.filter(s => s.fingers[name].ikConverged).length
            const jerks = this.samples.map(s => s.fingers[name].jerk)

            fingerStats[name] = {
                eeError: this._stats(errors),
                ikIterations: this._stats(iterations),
                ikSuccessRate: +(convergedCount / n * 100).toFixed(1),
                jerk: this._stats(jerks),
            }

            if(WALKING_FINGERS.includes(name))
            {
                const slips = this.samples.map(s => s.fingers[name].footSlip)
                const placements = this.samples.map(s => s.fingers[name].placementError)
                const penetrations = this.samples.map(s => s.fingers[name].penetrationDepth)
                fingerStats[name].footSlip = this._stats(slips)
                fingerStats[name].placementError = this._stats(placements)
                fingerStats[name].penetrationDepth = this._stats(penetrations)
            }
        })

        this._printReport(duration, n, ftStats, fpsStats, fingerStats)

        return { duration, sampleCount: n, frameTime: ftStats, fps: fpsStats, fingers: fingerStats }
    }

    _printReport(duration, n, ft, fps, fingers)
    {
        const pad = (v, w) => String(v).padEnd(w)
        const num = (v, d = 6) => Number(v).toFixed(d)

        let out = '\n'
        out += '═══════════════════════════════════════════════════════\n'
        out += '  Animation Quality Report\n'
        out += `  Duration: ${duration}s | Samples: ${n}\n`
        out += '═══════════════════════════════════════════════════════\n\n'

        out += 'Frame Time (ms)\n'
        out += `  Mean: ${num(ft.mean, 2)} | Std: ${num(ft.std, 2)} | Min: ${num(ft.min, 2)} | Max: ${num(ft.max, 2)}\n`
        out += `  P5: ${num(ft.p5, 2)} | P95: ${num(ft.p95, 2)} | P99: ${num(ft.p99, 2)}\n\n`

        out += 'FPS\n'
        out += `  Mean: ${num(fps.mean, 1)} | Min: ${num(fps.min, 1)} | Max: ${num(fps.max, 1)}\n\n`

        out += 'End-Effector Error\n'
        out += `  ${pad('Finger', 10)} ${pad('Mean', 12)} ${pad('Max', 12)} ${pad('IK Success', 12)} ${pad('Avg Iter', 10)}\n`
        ALL_CHAINS.forEach(name =>
        {
            const f = fingers[name]
            out += `  ${pad(name, 10)} ${pad(num(f.eeError.mean), 12)} ${pad(num(f.eeError.max), 12)} ${pad(f.ikSuccessRate + '%', 12)} ${pad(num(f.ikIterations.mean, 1), 10)}\n`
        })
        out += '\n'

        out += 'Foot Slip\n'
        out += `  ${pad('Finger', 10)} ${pad('Mean', 12)} ${pad('Max', 12)}\n`
        WALKING_FINGERS.forEach(name =>
        {
            const f = fingers[name].footSlip
            out += `  ${pad(name, 10)} ${pad(num(f.mean), 12)} ${pad(num(f.max), 12)}\n`
        })
        out += '\n'

        out += 'Foot Placement Accuracy\n'
        out += `  ${pad('Finger', 10)} ${pad('Mean', 12)} ${pad('Max', 12)}\n`
        WALKING_FINGERS.forEach(name =>
        {
            const f = fingers[name].placementError
            out += `  ${pad(name, 10)} ${pad(num(f.mean), 12)} ${pad(num(f.max), 12)}\n`
        })
        out += '\n'

        out += 'Bone Penetration Depth\n'
        out += `  ${pad('Finger', 10)} ${pad('Mean', 12)} ${pad('Max', 12)} ${pad('P95', 12)}\n`
        WALKING_FINGERS.forEach(name =>
        {
            const f = fingers[name].penetrationDepth
            out += `  ${pad(name, 10)} ${pad(num(f.mean), 12)} ${pad(num(f.max), 12)} ${pad(num(f.p95), 12)}\n`
        })
        out += '\n'

        out += 'Jerk (Motion Smoothness)\n'
        out += `  ${pad('Finger', 10)} ${pad('Mean', 12)} ${pad('Max', 12)}\n`
        ALL_CHAINS.forEach(name =>
        {
            const f = fingers[name].jerk
            out += `  ${pad(name, 10)} ${pad(num(f.mean, 2), 12)} ${pad(num(f.max, 2), 12)}\n`
        })
        out += '\n'

        out += '═══════════════════════════════════════════════════════\n'

        console.log(out)
    }

    _stats(values)
    {
        const sorted = [...values].sort((a, b) => a - b)
        const n = sorted.length
        const sum = sorted.reduce((s, v) => s + v, 0)
        const mean = sum / n
        const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n

        return {
            mean: +mean.toFixed(6),
            std: +Math.sqrt(variance).toFixed(6),
            min: +sorted[0].toFixed(6),
            max: +sorted[n - 1].toFixed(6),
            p5: +sorted[Math.floor(n * 0.05)].toFixed(6),
            p95: +sorted[Math.floor(n * 0.95)].toFixed(6),
            p99: +sorted[Math.floor(n * 0.99)].toFixed(6),
        }
    }

    exportCSV()
    {
        if(this.samples.length === 0)
        {
            console.warn('[Testing] No samples to export')
            return
        }

        const headers = [
            'timestamp', 'frameTime', 'fps', 'state',
            'pivotX', 'pivotY', 'pivotZ',
        ]

        ALL_CHAINS.forEach(name =>
        {
            headers.push(`${name}_eeError`, `${name}_ikIter`, `${name}_ikConverged`)
            headers.push(`${name}_vel`, `${name}_acc`, `${name}_jerk`)
            if(WALKING_FINGERS.includes(name))
                headers.push(`${name}_footSlip`, `${name}_isPlanted`, `${name}_placementError`, `${name}_penetration`)
        })

        const rows = this.samples.map(s =>
        {
            const row = [
                s.timestamp.toFixed(1),
                s.frameTime.toFixed(2),
                s.fps.toFixed(1),
                s.state,
                s.pivotPosition.x.toFixed(6),
                s.pivotPosition.y.toFixed(6),
                s.pivotPosition.z.toFixed(6),
            ]

            ALL_CHAINS.forEach(name =>
            {
                const f = s.fingers[name]
                row.push(
                    f.endEffectorError.toFixed(6),
                    f.ikIterations,
                    f.ikConverged ? 1 : 0,
                    f.velocity.toFixed(6),
                    f.acceleration.toFixed(6),
                    f.jerk.toFixed(6),
                )
                if(WALKING_FINGERS.includes(name))
                    row.push(f.footSlip.toFixed(6), f.isPlanted ? 1 : 0, f.placementError.toFixed(6), f.penetrationDepth.toFixed(6))
            })

            return row.join(',')
        })

        const csv = headers.join(',') + '\n' + rows.join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `animation_metrics_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)

        console.log(`[Testing] Exported ${this.samples.length} samples as CSV`)
    }

    _setupGUI()
    {
        const folder = this.debug.ui.addFolder('Testing')

        const liveFolder = folder.addFolder('Live Metrics')
        liveFolder.add(this.live, 'fps').name('FPS').listen().disable()
        liveFolder.add(this.live, 'frameTimeMs').name('Frame Time (ms)').listen().disable()
        liveFolder.add(this.live, 'avgEndEffectorError').name('Avg EE Error').listen().disable()
        liveFolder.add(this.live, 'maxEndEffectorError').name('Max EE Error').listen().disable()
        liveFolder.add(this.live, 'ikSuccessRate').name('IK Success %').listen().disable()
        liveFolder.add(this.live, 'avgFootSlip').name('Avg Foot Slip').listen().disable()
        liveFolder.add(this.live, 'avgJerk').name('Avg Jerk').listen().disable()
        liveFolder.add(this.live, 'avgPlacementError').name('Avg Placement Err').listen().disable()
        liveFolder.add(this.live, 'maxPenetrationDepth').name('Max Penetration').listen().disable()

        const recFolder = folder.addFolder('Recording')
        recFolder.add(this.live, 'sampleCount').name('Samples').listen().disable()
        recFolder.add(this.live, 'duration').name('Duration (s)').listen().disable()

        const actions = {
            startRecording: () => this.startRecording(),
            stopRecording: () => this.stopRecording(),
            exportCSV: () => this.exportCSV(),
            printReport: () => this.getReport(),
        }

        recFolder.add(actions, 'startRecording').name('Start Recording')
        recFolder.add(actions, 'stopRecording').name('Stop Recording')
        recFolder.add(actions, 'exportCSV').name('Export CSV')
        recFolder.add(actions, 'printReport').name('Print Report')
    }
}
