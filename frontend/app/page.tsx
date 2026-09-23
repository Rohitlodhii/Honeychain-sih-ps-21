'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, ChevronRight, Flower2, Hexagon, Leaf, QrCode, ShieldCheck, Sprout, Waves } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
}

function Bee({ className = '' }: { className?: string }) {
  return <motion.div animate={{ y: [0, -7, 0], rotate: [-4, 4, -4] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} className={`absolute ${className}`}>
    <div className="relative h-6 w-8 rotate-[-18deg]">
      <i className="absolute left-1 top-0 h-3 w-4 rounded-full border border-amber-950/30 bg-white/80" />
      <i className="absolute left-4 top-1 h-3 w-4 rounded-full border border-amber-950/30 bg-white/80" />
      <i className="absolute left-2 top-2 h-4 w-5 rounded-full bg-amber-400 before:absolute before:left-1 before:top-0 before:h-4 before:w-1 before:bg-amber-950 after:absolute after:right-1 after:top-0 after:h-4 after:w-1 after:bg-amber-950" />
    </div>
  </motion.div>
}

function HeroIllustration() {
  const { t } = useI18n()
  return <div className="relative mx-auto aspect-square w-full max-w-[540px] overflow-hidden rounded-[2.5rem] border border-amber-900/10 bg-[#f7edcf] shadow-[0_30px_80px_-35px_rgba(79,49,13,.55)]">
    <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(circle_at_70%_20%,#fff9e8_0,transparent_35%),linear-gradient(135deg,#f8e9bb,#f3d489)]" />
    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-amber-300/30" />
    <div className="absolute left-9 top-10 grid grid-cols-3 gap-1.5 opacity-40">
      {[...Array(9)].map((_, i) => <Hexagon key={i} className="h-7 w-7 fill-amber-300 text-amber-400" />)}
    </div>
    <motion.div initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .35, duration: .6 }} className="absolute right-[13%] top-[15%] rounded-2xl border border-amber-900/10 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">{t.home.hiveHealth}</p><p className="text-sm font-bold text-emerald-700">{t.home.healthyNow}</p>
    </motion.div>
    <Bee className="left-[18%] top-[34%]" /><Bee className="right-[10%] top-[42%] scale-75" />
    <div className="absolute bottom-[23%] left-[13%] h-32 w-44 rounded-t-[5rem] bg-[#b96e26] shadow-[inset_0_0_0_7px_#d5913f]">
      <div className="absolute inset-x-3 top-10 h-2 rounded bg-[#704117]" /><div className="absolute inset-x-3 top-[4.2rem] h-2 rounded bg-[#704117]" />
      <div className="absolute -top-5 left-[-10px] h-8 w-[calc(100%+20px)] rounded-t-2xl bg-[#7c481d]" />
      <div className="absolute bottom-4 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-amber-950" />
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-[37%] rounded-t-[50%] bg-[#8fae63]" />
    {[['left-[7%]','bottom-[10%]'],['left-[35%]','bottom-[4%]'],['right-[8%]','bottom-[9%]']].map(([x,y], i) => <Flower2 key={i} className={`absolute ${x} ${y} h-8 w-8 text-orange-500`} />)}
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .45, duration: .55 }} className="absolute bottom-[5%] right-[16%] w-32 rounded-b-[2rem] rounded-t-xl border-[7px] border-[#743b12] bg-amber-300 px-4 pb-5 pt-8 shadow-xl">
      <div className="absolute -top-5 left-2 right-2 h-8 rounded-xl bg-[#743b12]" /><div className="mx-auto grid w-14 grid-cols-4 gap-1 bg-[#fff5d7] p-1.5">{[...Array(16)].map((_, i) => <span key={i} className={`aspect-square ${i % 3 === 0 ? 'bg-amber-950' : 'bg-transparent'}`} />)}</div>
      <p className="mt-2 text-center text-[8px] font-bold tracking-widest text-amber-950">{t.home.verified}</p>
    </motion.div>
  </div>
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { t } = useI18n()
  useEffect(() => setIsAuthenticated(Boolean(localStorage.getItem('token'))), [])

  return <main className="min-h-screen overflow-hidden bg-[#fffdf8] text-[#2f2719]">
    <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-amber-950"><Hexagon className="h-5 w-5 fill-amber-950 text-amber-950" /></span><span className="text-xl">HoneyChain</span></Link>
      <div className="flex items-center gap-2 sm:gap-4"><LanguageSwitcher />{isAuthenticated ? <><Link href="/dashboard" className="hidden text-sm font-medium sm:block">{t.home.dashboard}</Link><button onClick={() => { localStorage.removeItem('token'); setIsAuthenticated(false) }} className="text-sm font-medium text-stone-600">{t.home.signOut}</button></> : <><Link href="/login" className="text-sm font-medium text-stone-600">{t.home.signIn}</Link><Link href="/register" className="rounded-full bg-[#332a1b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">{t.home.getStarted}</Link></>}</div>
    </nav>

    <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-20">
      <div className="absolute left-[-14rem] top-10 -z-0 h-96 w-96 rounded-full bg-amber-100 blur-3xl" />
      <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: .12 }} className="relative z-10">
        <motion.div variants={reveal} className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.home.badge}</motion.div>
        <motion.h1 variants={reveal} className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-.055em] text-[#32291b] sm:text-6xl lg:text-7xl">{t.home.titleA} <span className="text-amber-600">{t.home.titleB}</span></motion.h1>
        <motion.p variants={reveal} className="mt-7 max-w-xl text-lg leading-8 text-stone-600">{t.home.subtitle}</motion.p>
        <motion.div variants={reveal} className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="group inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 font-semibold text-amber-950 shadow-lg shadow-amber-200 transition hover:bg-amber-400">{t.home.startApiary} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link><Link href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3.5 font-semibold transition hover:border-amber-300">{t.home.howItWorks} <ChevronRight className="h-4 w-4" /></Link></motion.div>
        <motion.div variants={reveal} className="mt-11 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-stone-600"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{t.home.checkQr}</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{t.home.checkOffline}</span></motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: .94, x: 30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .8, delay: .25, ease: 'easeOut' }} className="relative z-10"><HeroIllustration /></motion.div>
    </section>

    <section className="border-y border-amber-100 bg-[#fff7e7]"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-amber-200/60 px-5 sm:grid-cols-4 lg:px-8">{[['100%',t.home.statTraceable],['24/7',t.home.statInsights],['1 scan',t.home.statScan],['Offline',t.home.statOffline]].map(([value,label]) => <div key={label} className="py-7 text-center"><p className="text-2xl font-semibold tracking-tight text-amber-800">{value}</p><p className="mt-1 text-xs font-medium text-stone-500">{label}</p></div>)}</div></section>

    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-amber-700">{t.home.ecoKicker}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{t.home.ecoTitle}</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[[QrCode,t.home.feat1T,t.home.feat1D],[Waves,t.home.feat2T,t.home.feat2D],[ShieldCheck,t.home.feat3T,t.home.feat3D]].map(([Icon,title,copy], i) => { const I = Icon as typeof QrCode; return <motion.article key={String(title)} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ delay: i * .12 }} className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800"><I className="h-6 w-6" /></div><h3 className="mt-6 text-xl font-semibold">{title as string}</h3><p className="mt-3 leading-7 text-stone-600">{copy as string}</p></motion.article>})}</div></section>

    <section id="how-it-works" className="bg-[#32291b] px-5 py-24 text-[#fff9ed] lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-amber-400">{t.home.howKicker}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{t.home.howTitle}</h2></div><Leaf className="h-12 w-12 text-amber-400" /></div><div className="mt-14 grid gap-7 md:grid-cols-3">{[['01',t.home.step1T,t.home.step1D],['02',t.home.step2T,t.home.step2D],['03',t.home.step3T,t.home.step3D]].map(([number,title,copy]) => <div key={number} className="border-t border-amber-400/40 pt-5"><p className="text-sm font-semibold text-amber-400">{number}</p><h3 className="mt-6 text-2xl font-medium">{title}</h3><p className="mt-3 max-w-sm leading-7 text-stone-300">{copy}</p></div>)}</div></div></section>

    <section className="relative overflow-hidden px-5 py-24 text-center lg:px-8"><div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#ffe4a6,transparent_43%)]" /><Sprout className="mx-auto h-10 w-10 text-amber-700" /><h2 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold tracking-[-.045em] sm:text-5xl">{t.home.ctaTitle}</h2><p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-stone-600">{t.home.ctaSub}</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#332a1b] px-6 py-3.5 font-semibold text-white transition hover:bg-amber-800">{t.home.ctaBtn} <ArrowRight className="h-4 w-4" /></Link></section>

    <footer className="border-t border-stone-200 px-5 py-7 text-sm text-stone-500 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:justify-between"><span className="font-medium text-stone-700">HoneyChain</span><span>{t.home.footerTag}</span></div></footer>
  </main>
}
