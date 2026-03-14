export type Framework = 'html' | 'react' | 'nextjs' | 'vue' | 'nuxt' | 'astro' | 'svelte';
export type AdStyle = 'responsive' | 'in-article' | 'in-feed' | 'fixed';

interface SnippetOptions {
  framework: Framework;
  publisherId: string;
  slotId: string;
  style: AdStyle;
  width?: number;
  height?: number;
}

function adFormat(style: AdStyle): string {
  switch (style) {
    case 'in-article': return 'fluid';
    case 'in-feed': return 'fluid';
    default: return 'auto';
  }
}

function layoutKey(style: AdStyle): string {
  if (style === 'in-article') return '\n     data-ad-layout="in-article"';
  if (style === 'in-feed') return '\n     data-ad-layout="-fb+5w+4e-db+86"';
  return '';
}

function styleAttr(style: AdStyle, width?: number, height?: number): string {
  if (style === 'fixed' && width && height) {
    return `display:inline-block;width:${width}px;height:${height}px`;
  }
  if (style === 'in-article' || style === 'in-feed') {
    return 'display:block; text-align:center;';
  }
  return 'display:block';
}

function fullWidthResponsive(style: AdStyle): string {
  if (style === 'responsive') return '\n     data-full-width-responsive="true"';
  return '';
}

// --- Templates ---

function html(o: SnippetOptions): string {
  return `<!-- AdSense: Load once in <head> -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}"
     crossorigin="anonymous"></script>

<!-- Ad Unit: ${o.style} -->
<ins class="adsbygoogle"
     style="${styleAttr(o.style, o.width, o.height)}"
     data-ad-client="${o.publisherId}"
     data-ad-slot="${o.slotId}"
     data-ad-format="${adFormat(o.style)}"${layoutKey(o.style)}${fullWidthResponsive(o.style)}></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`;
}

function react(o: SnippetOptions): string {
  return `// components/AdUnit.tsx
'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdUnitProps {
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
}

export function AdUnit({
  slot,
  format = '${adFormat(o.style)}',
  responsive = ${o.style === 'responsive'},
  style = { ${o.style === 'fixed' && o.width ? `display: 'inline-block', width: ${o.width}, height: ${o.height}` : "display: 'block'"} },
}: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client="${o.publisherId}"
      data-ad-slot={slot}
      data-ad-format={format}${o.style === 'responsive' ? `
      data-full-width-responsive={responsive ? 'true' : 'false'}` : ''}
    />
  );
}

// Usage:
// <AdUnit slot="${o.slotId}" />`;
}

function nextjs(o: SnippetOptions): string {
  return `// 1. app/layout.tsx - Add AdSense script
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

// 2. components/AdUnit.tsx - Reusable ad component
${react(o)}`;
}

function vue(o: SnippetOptions): string {
  return `<!-- components/AdUnit.vue -->
<template>
  <ins
    class="adsbygoogle"
    :style="adStyle"
    :data-ad-client="publisherId"
    :data-ad-slot="slot"
    data-ad-format="${adFormat(o.style)}"${o.style === 'responsive' ? `
    data-full-width-responsive="true"` : ''}
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  slot: string;
}>();

const publisherId = '${o.publisherId}';
const adStyle = { ${o.style === 'fixed' && o.width ? `display: 'inline-block', width: '${o.width}px', height: '${o.height}px'` : "display: 'block'"} };

const pushed = ref(false);

onMounted(() => {
  if (pushed.value) return;
  try {
    ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    pushed.value = true;
  } catch (e) {
    console.error('AdSense error:', e);
  }
});
</script>

<!-- Usage: <AdUnit slot="${o.slotId}" /> -->

<!-- Add to index.html <head>: -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}" crossorigin="anonymous"></script> -->`;
}

function nuxt(o: SnippetOptions): string {
  return `// 1. nuxt.config.ts - Add AdSense script
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}',
          async: true,
          crossorigin: 'anonymous',
        },
      ],
    },
  },
});

// 2. components/AdUnit.vue
${vue(o)}`;
}

function astro(o: SnippetOptions): string {
  return `---
// components/AdUnit.astro
interface Props {
  slot: string;
}

const { slot } = Astro.props;
const publisherId = '${o.publisherId}';
---

<ins
  class="adsbygoogle"
  style="${styleAttr(o.style, o.width, o.height)}"
  data-ad-client={publisherId}
  data-ad-slot={slot}
  data-ad-format="${adFormat(o.style)}"${o.style === 'responsive' ? `
  data-full-width-responsive="true"` : ''}
></ins>

<script is:inline>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>

<!-- Add to your Layout.astro <head>: -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}" crossorigin="anonymous" is:inline></script> -->

<!-- Usage: <AdUnit slot="${o.slotId}" /> -->`;
}

function svelte(o: SnippetOptions): string {
  return `<!-- components/AdUnit.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  export let slot: string;
  const publisherId = '${o.publisherId}';

  let pushed = false;

  onMount(() => {
    if (pushed) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed = true;
    } catch (e) {
      console.error('AdSense error:', e);
    }
  });
</script>

<ins
  class="adsbygoogle"
  style="${styleAttr(o.style, o.width, o.height)}"
  data-ad-client={publisherId}
  data-ad-slot={slot}
  data-ad-format="${adFormat(o.style)}"${o.style === 'responsive' ? `
  data-full-width-responsive="true"` : ''}
></ins>

<!-- Add to app.html <head>: -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${o.publisherId}" crossorigin="anonymous"></script> -->

<!-- Usage: <AdUnit slot="${o.slotId}" /> -->`;
}

const generators: Record<Framework, (o: SnippetOptions) => string> = {
  html, react, nextjs, vue, nuxt, astro, svelte,
};

export function generateSnippet(options: SnippetOptions): string {
  const gen = generators[options.framework];
  if (!gen) throw new Error(`Unsupported framework: ${options.framework}`);
  return gen(options);
}
