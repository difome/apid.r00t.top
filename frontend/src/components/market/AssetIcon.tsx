type AssetIconProps = {
  code?: string
  type?: string
  emoji?: string
  className?: string
}

type IconToken = {
  label: string
  color: string
  bg: string
  weight?: string
}

const iconTokens: Record<string, IconToken> = {
  BTC: { label: 'B', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', weight: '800' },
  ETH: { label: 'Ξ', color: '#8b9cff', bg: 'rgba(139, 156, 255, 0.16)', weight: '700' },
  SOL: { label: 'S', color: '#7cffa4', bg: 'rgba(124, 255, 164, 0.14)', weight: '800' },
  TON: { label: '◆', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  USDT: { label: '₮', color: '#26a17b', bg: 'rgba(38, 161, 123, 0.15)', weight: '800' },
  DOGE: { label: 'Ð', color: '#c2a633', bg: 'rgba(194, 166, 51, 0.15)', weight: '800' },
  XAU: { label: 'Au', color: '#d6a94a', bg: 'rgba(214, 169, 74, 0.16)', weight: '800' },
  XAG: { label: 'Ag', color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.14)', weight: '800' },
  XPT: { label: 'Pt', color: '#a7b7c9', bg: 'rgba(167, 183, 201, 0.14)', weight: '800' },
  XPD: { label: 'Pd', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.14)', weight: '800' },
  HG: { label: 'Cu', color: '#d97745', bg: 'rgba(217, 119, 69, 0.15)', weight: '800' },
  ALI: { label: 'Al', color: '#b8c2cc', bg: 'rgba(184, 194, 204, 0.14)', weight: '800' },
  NI: { label: 'Ni', color: '#93a3b8', bg: 'rgba(147, 163, 184, 0.14)', weight: '800' },
  ZN: { label: 'Zn', color: '#9aa6b2', bg: 'rgba(154, 166, 178, 0.14)', weight: '800' },
  PB: { label: 'Pb', color: '#8792a2', bg: 'rgba(135, 146, 162, 0.14)', weight: '800' },
  SN: { label: 'Sn', color: '#b4bfca', bg: 'rgba(180, 191, 202, 0.14)', weight: '800' },
  JBP: { label: 'Fe', color: '#b7795a', bg: 'rgba(183, 121, 90, 0.15)', weight: '800' },
  LC: { label: 'Li', color: '#9bd674', bg: 'rgba(155, 214, 116, 0.15)', weight: '800' },
  UXA: { label: 'U', color: '#b7d96a', bg: 'rgba(183, 217, 106, 0.15)', weight: '800' },
  CL1: { label: 'Oil', color: '#7dd3fc', bg: 'rgba(125, 211, 252, 0.13)', weight: '800' },
  BZ: { label: 'Oil', color: '#7dd3fc', bg: 'rgba(125, 211, 252, 0.13)', weight: '800' },
  NG: { label: 'Gas', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.14)', weight: '800' },
  ZW: { label: 'Wh', color: '#d9b65d', bg: 'rgba(217, 182, 93, 0.15)', weight: '800' },
  ZC: { label: 'Co', color: '#facc15', bg: 'rgba(250, 204, 21, 0.14)', weight: '800' },
  ZS: { label: 'Sy', color: '#86efac', bg: 'rgba(134, 239, 172, 0.13)', weight: '800' },
  KC: { label: 'Cf', color: '#b9835a', bg: 'rgba(185, 131, 90, 0.15)', weight: '800' },
  SB: { label: 'Su', color: '#f0f4f8', bg: 'rgba(240, 244, 248, 0.12)', weight: '800' },
  CT: { label: 'Ct', color: '#e5e7eb', bg: 'rgba(229, 231, 235, 0.12)', weight: '800' },
}

const fiatFlags: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', UAH: '🇺🇦', RUB: '🇷🇺', BYN: '🇧🇾', CNY: '🇨🇳', KZT: '🇰🇿',
  PLN: '🇵🇱', CHF: '🇨🇭', JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺', TRY: '🇹🇷', GEL: '🇬🇪', MDL: '🇲🇩',
}

export function AssetIcon({ code = '', type, emoji }: AssetIconProps) {
  const normalizedCode = code.toUpperCase()
  const token = iconTokens[normalizedCode]

  if (token) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[9px] tracking-tight"
        style={{ color: token.color, backgroundColor: token.bg, fontWeight: token.weight || '700' }}
      >
        {token.label}
      </span>
    )
  }

  const flag = fiatFlags[normalizedCode]
  if (flag) {
    return <span className="text-base leading-none">{flag}</span>
  }

  if (emoji && type !== 'commodity') {
    return <span className="text-base leading-none">{emoji}</span>
  }

  return <span className="text-[10px] font-semibold leading-none">{normalizedCode.slice(0, 2) || '??'}</span>
}
