export type SalesPlatformId = "payt" | "coinzz" | "logzz" | "manual";
export type SalesPlatform = {
  id: SalesPlatformId;
  name: string;
  logoSrc?: string;
  color: string;
  accentClass: string;
  description: string;
};

export const salesPlatforms: SalesPlatform[] = [
  {
    id: "payt",
    name: "Payt",
    logoSrc: "/platforms/payt.png",
    color: "#f58220",
    accentClass: "border-[#f58220]/35 bg-[#f58220]/10 text-[#ffb36d]",
    description: "Origem Payt · modalidade definida acima"
  },
  {
    id: "coinzz",
    name: "Coinzz",
    logoSrc: "/platforms/coinzz.png",
    color: "#7c3aed",
    accentClass: "border-[#7c3aed]/35 bg-[#7c3aed]/10 text-[#c4b5fd]",
    description: "Origem Coinzz · modalidade definida acima"
  },
  {
    id: "logzz",
    name: "Logzz",
    logoSrc: "/platforms/logzz.png",
    color: "#22c55e",
    accentClass: "border-[#22c55e]/35 bg-[#22c55e]/10 text-[#86efac]",
    description: "Origem Logzz · modalidade definida acima"
  },
  {
    id: "manual",
    name: "Venda Manual",
    logoSrc: "/platforms/kau-manual.png",
    color: "#37e699",
    accentClass: "border-money/45 bg-money/[.11] text-money shadow-[0_0_0_1px_rgba(55,230,153,.05),0_12px_32px_rgba(3,38,24,.24)]",
    description: "Venda registrada fora das plataformas integradas."
  }
];

export function getSalesPlatform(id?: string | null) {
  return salesPlatforms.find((platform) => platform.id === id) || null;
}

