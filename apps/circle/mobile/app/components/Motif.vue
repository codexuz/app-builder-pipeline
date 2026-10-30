<script setup lang="ts">
// Authored patterns from each style's craft: bazaar awnings, adras ikat, Rishtan plate rims,
// girih star tiles and suzani medallions. Drawn as SVG so they stay sharp and weigh almost nothing.
defineProps<{ kind: 'awning' | 'ikat' | 'plate' | 'girih' | 'suzani' }>()

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const uid = useId()

// Ikat threads are dyed in bundles, so edges step instead of running smooth.
const ikatSteps = (w: number) => range(9).map((i) => {
  const y = i * 20
  const off = (i % 2) * 3
  const half = w * (1 - Math.abs(i - 4) / 4.5)
  return { y, x: 60 - half + off, w: half * 2 }
})
</script>

<template>
  <svg v-if="kind === 'awning'" class="motif motif--awning" width="100%" height="18" aria-hidden="true">
    <defs>
      <pattern :id="`${uid}a`" width="56" height="18" patternUnits="userSpaceOnUse">
        <rect width="28" height="8" fill="var(--awning-a)" />
        <rect x="28" width="28" height="8" fill="var(--awning-b)" />
        <path d="M0 8a14 9 0 0 0 28 0z" fill="var(--awning-a)" />
        <path d="M28 8a14 9 0 0 0 28 0z" fill="var(--awning-b)" />
      </pattern>
    </defs>
    <rect width="100%" height="18" :fill="`url(#${uid}a)`" />
  </svg>

  <svg v-else-if="kind === 'ikat'" class="motif motif--ikat" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern :id="`${uid}i`" width="240" height="180" patternUnits="userSpaceOnUse">
        <rect width="240" height="180" fill="var(--ikat-ground)" />
        <g v-for="(tx, c) in [0, 120]" :key="c" :transform="`translate(${tx} 0)`">
          <rect v-for="s in ikatSteps(56)" :key="`a${s.y}`" :x="s.x" :y="s.y" :width="s.w" height="20" :fill="c ? 'var(--ikat-b)' : 'var(--ikat-a)'" />
          <rect v-for="s in ikatSteps(30)" :key="`b${s.y}`" :x="s.x" :y="s.y" :width="s.w" height="20" fill="var(--ikat-c)" />
          <rect v-for="s in ikatSteps(11)" :key="`c${s.y}`" :x="s.x" :y="s.y" :width="s.w" height="20" :fill="c ? 'var(--ikat-a)' : 'var(--ikat-b)'" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" :fill="`url(#${uid}i)`" />
  </svg>

  <svg v-else-if="kind === 'plate'" class="motif motif--plate" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="98" fill="var(--plate-rim)" />
    <g v-for="i in range(24)" :key="i" :transform="`rotate(${i * 15} 100 100)`">
      <path d="M100 4c6 8 6 15 0 21-6-6-6-13 0-21z" fill="var(--plate-petal)" />
      <circle cx="100" cy="29" r="1.8" fill="var(--plate-dot)" />
    </g>
    <circle cx="100" cy="100" r="68" fill="none" stroke="var(--plate-dot)" stroke-width="1.5" />
  </svg>

  <svg v-else-if="kind === 'girih'" class="motif motif--girih" width="100%" height="100%" aria-hidden="true">
    <defs>
      <pattern :id="`${uid}g`" width="120" height="120" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="var(--girih-line)" stroke-width="1.2">
          <path d="M60 18 72 42 96 30 84 54 108 60 84 66 96 90 72 78 60 102 48 78 24 90 36 66 12 60 36 54 24 30 48 42z" />
          <path d="M60 42 73 47 78 60 73 73 60 78 47 73 42 60 47 47z" />
          <path d="M0 0 24 30M120 0 96 30M0 120 24 90M120 120 96 90M60 0v18M60 102v18M0 60h12M108 60h12" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" :fill="`url(#${uid}g)`" />
  </svg>

  <svg v-else class="motif motif--suzani" viewBox="0 0 400 400" aria-hidden="true">
    <circle cx="200" cy="200" r="190" fill="var(--suzani-a)" />
    <g v-for="i in range(12)" :key="`o${i}`" :transform="`rotate(${i * 30} 200 200)`">
      <path d="M200 22c28 26 28 62 0 88-28-26-28-62 0-88z" fill="var(--suzani-b)" />
      <path d="M200 44c13 14 13 30 0 44-13-14-13-30 0-44z" fill="var(--suzani-c)" />
      <circle cx="200" cy="124" r="5" fill="var(--suzani-c)" />
    </g>
    <circle cx="200" cy="200" r="74" fill="var(--suzani-b)" />
    <g v-for="i in range(8)" :key="`i${i}`" :transform="`rotate(${i * 45} 200 200)`">
      <path d="M200 132c15 16 15 36 0 52-15-16-15-36 0-52z" fill="var(--suzani-c)" />
    </g>
    <circle cx="200" cy="200" r="16" fill="var(--suzani-a)" />
  </svg>
</template>
