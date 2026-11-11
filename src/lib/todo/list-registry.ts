import {
  ArchiveIcon,
  BellIcon,
  BriefcaseIcon,
  HeartIcon,
  InboxIcon,
  LightbulbIcon,
  ListTodoIcon,
  type LucideIcon,
  RepeatIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from "lucide-react";

/**
 * The app's lists are defined in code, not created by the user. Each list
 * can later get its own fields and add/edit UI; that belongs here.
 */
export interface ListDefinition {
  /** Stable id stored on tasks; never change it once used. */
  id: string;
  name: string;
  icon: LucideIcon;
}

export const LIST_DEFINITIONS: ListDefinition[] = [
  { id: "inbox", name: "Inbox", icon: InboxIcon },
  { id: "zadania", name: "Zadania", icon: ListTodoIcon },
  { id: "backlog", name: "Backlog", icon: ArchiveIcon },
  { id: "gsk", name: "GSK", icon: BriefcaseIcon },
  { id: "werka", name: "Werka", icon: HeartIcon },
  { id: "kupic", name: "Kupić", icon: ShoppingCartIcon },
  { id: "pamietac", name: "Pamiętać", icon: LightbulbIcon },
  { id: "powtarzalne", name: "Powtarzalne", icon: RepeatIcon },
  { id: "przypomnienia", name: "Przypomnienia", icon: BellIcon },
  { id: "zaneta", name: "Żaneta", icon: SparklesIcon },
];

/** Tasks from lists that no longer exist end up here. */
export const DEFAULT_LIST_ID = "inbox";

const byId = new Map(LIST_DEFINITIONS.map((d) => [d.id, d]));

export function getListDefinition(id: string): ListDefinition | undefined {
  return byId.get(id);
}
