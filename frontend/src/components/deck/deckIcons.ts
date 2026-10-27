import {
  Atom,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Camera,
  ChartLine,
  ChefHat,
  Code,
  Database,
  Dna,
  Dumbbell,
  FlaskConical,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  Languages,
  Music,
  Palette,
  PenLine,
  Plane,
  Scale,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import type { DeckIcon } from "../../constants";

export const DECK_ICON_COMPONENTS: Record<DeckIcon, LucideIcon> = {
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  brain: Brain,
  "pen-line": PenLine,
  languages: Languages,
  globe: Globe,
  landmark: Landmark,
  music: Music,
  palette: Palette,
  code: Code,
  database: Database,
  "flask-conical": FlaskConical,
  atom: Atom,
  dna: Dna,
  "heart-pulse": HeartPulse,
  calculator: Calculator,
  sigma: Sigma,
  "chart-line": ChartLine,
  briefcase: Briefcase,
  scale: Scale,
  camera: Camera,
  dumbbell: Dumbbell,
  "chef-hat": ChefHat,
  plane: Plane,
};

function isDeckIcon(name: string): name is DeckIcon {
  return Object.hasOwn(DECK_ICON_COMPONENTS, name);
}

export function getDeckIcon(name: string): LucideIcon {
  return isDeckIcon(name) ? DECK_ICON_COMPONENTS[name] : BookOpen;
}
