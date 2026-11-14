import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  CarIcon,
  ClapperboardIcon,
  EllipsisIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HouseIcon,
  ReceiptIcon,
  RepeatIcon,
  ShoppingBagIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  TrendingUpIcon,
  UtensilsCrossedIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

const BY_NAME: Record<string, LucideIcon> = {
  Moradia: HouseIcon,
  Mercado: ShoppingBasketIcon,
  "Alimentação fora": UtensilsCrossedIcon,
  Transporte: CarIcon,
  Saúde: HeartPulseIcon,
  Educação: GraduationCapIcon,
  Lazer: ClapperboardIcon,
  Assinaturas: RepeatIcon,
  Compras: ShoppingBagIcon,
  "Contas e taxas": ReceiptIcon,
  "Outras despesas": EllipsisIcon,
  Salário: BanknoteIcon,
  "Renda extra": SparklesIcon,
  Investimentos: TrendingUpIcon,
  "Outras receitas": WalletIcon,
};

/** Ícone de uma transação: pela categoria; transferência tem o seu; senão, por tipo. */
export function transactionIcon(
  type: "income" | "expense" | "transfer",
  categoryName?: string | null,
): LucideIcon {
  if (type === "transfer") return ArrowLeftRightIcon;
  if (categoryName && BY_NAME[categoryName]) return BY_NAME[categoryName];
  return type === "income" ? WalletIcon : EllipsisIcon;
}
