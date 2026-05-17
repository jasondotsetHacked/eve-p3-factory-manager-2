import { clearChildren } from "../../utils/dom.js";
import { Panel } from "../primitives/Panel.js";
import { ColonyListItem } from "../components/ColonyListItem.js";

export function ColonySidebar({ colonies, selectedColonyId, dataSource, onSelectColony }) {
  const list = document.createElement("div");
  list.className = "colony-list";

  function renderList(nextSelectedColonyId) {
    clearChildren(list);

    if (!colonies.length) {
      const empty = document.createElement("div");
      empty.className = "sidebar-empty";
      empty.textContent = dataSource === "live-error" ? "Live ESI load failed." : "No live colonies loaded.";
      list.append(empty);
      return;
    }

    colonies.forEach((colony) => {
      list.append(
        ColonyListItem({
          colony,
          isSelected: colony.id === nextSelectedColonyId,
          onSelect: onSelectColony,
        }),
      );
    });
  }

  renderList(selectedColonyId);

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.append(Panel({ title: "Colonies", children: [list] }));

  return {
    element: sidebar,
    update(nextSelectedColonyId) {
      renderList(nextSelectedColonyId);
    },
  };
}
