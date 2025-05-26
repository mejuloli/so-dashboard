// so-dashboard/front-end/src/data/mockData.js

// --- CPU Data ---
const overallCpuUsageValue = 17.5;
const coreUsageValues = [
    { id: 0, name: 'Core 0', usage: 25.0 },
    { id: 1, name: 'Core 1', usage: 15.0 },
    { id: 2, name: 'Core 2', usage: 10.0 },
    { id: 3, name: 'Core 3', usage: 20.0 },
    // Adicione mais cores se seu sistema tiver (e atualize o histórico e CORE_COLORS)
    // { id: 4, name: 'Core 4', usage: 30.0 },
    // { id: 5, name: 'Core 5', usage: 12.0 },
];

export const mockCpuData = {
    overallUsage: overallCpuUsageValue,
    cores: coreUsageValues,
    history: [
        // Certifique-se de que as chaves 'coreX' correspondem aos IDs em coreUsageValues
        { time: '20:50', core0: 10, core1: 8, core2: 12, core3: 5,  /* core4: X, core5: Y, */ overall: 8.75 },
        { time: '20:51', core0: 15, core1: 12, core2: 10, core3: 18, /* core4: X, core5: Y, */ overall: 13.75 },
        { time: '20:52', core0: 12, core1: 10, core2: 8, core3: 15, /* core4: X, core5: Y, */ overall: 11.25 },
        { time: '20:53', core0: 18, core1: 20, core2: 15, core3: 22, /* core4: X, core5: Y, */ overall: 18.75 },
        { time: '20:54', core0: 22, core1: 18, core2: 25, core3: 20, /* core4: X, core5: Y, */ overall: 21.25 },
        { time: '20:55', core0: 17, core1: 15, core2: 19, core3: 16, /* core4: X, core5: Y, */ overall: 16.75 },
        { time: '20:56', core0: 19, core1: 22, core2: 17, core3: 18, /* core4: X, core5: Y, */ overall: 19.0 },
        { time: '20:57', core0: 16, core1: 14, core2: 15, core3: 13, /* core4: X, core5: Y, */ overall: 14.5 },
        { time: '20:58', core0: 20, core1: 25, core2: 22, core3: 24, /* core4: X, core5: Y, */ overall: 22.75 },
        { time: '20:59', core0: 25, core1: 20, core2: 28, core3: 26, /* core4: X, core5: Y, */ overall: 24.75 },
        {
            time: '21:00',
            core0: coreUsageValues.find(c => c.id === 0)?.usage || 0,
            core1: coreUsageValues.find(c => c.id === 1)?.usage || 0,
            core2: coreUsageValues.find(c => c.id === 2)?.usage || 0,
            core3: coreUsageValues.find(c => c.id === 3)?.usage || 0,
            // core4: coreUsageValues.find(c => c.id === 4)?.usage || 0,
            // core5: coreUsageValues.find(c => c.id === 5)?.usage || 0,
            overall: overallCpuUsageValue
        },
    ],
};


// --- Memory Data ---
export const mockMemoryData = {
    totalMB: 15987, // em MB
    usedMB: 6750,   // em MB
    // freeMB pode ser calculado: totalMB - usedMB
    // buffersMB: 500, // Opcional
    // cachedMB: 3000, // Opcional
    history: [ // Uso em MB
        { time: '20:50', usedMB: 4500 },
        { time: '20:51', usedMB: 4800 },
        { time: '20:52', usedMB: 5200 },
        { time: '20:53', usedMB: 5000 },
        { time: '20:54', usedMB: 5500 },
        { time: '20:55', usedMB: 6000 },
        { time: '20:56', usedMB: 6200 },
        { time: '20:57', usedMB: 5800 },
        { time: '20:58', usedMB: 6500 },
        { time: '20:59', usedMB: 6600 },
        { time: '21:00', usedMB: 6750 },
    ],
};