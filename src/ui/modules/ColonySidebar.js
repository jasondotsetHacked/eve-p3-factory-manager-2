import { clearChildren } from "../../utils/dom.js";
import { Panel } from "../primitives/Panel.js";
import { ColonyListItem } from "../components/ColonyListItem.js";

export function ColonySidebar({ colonies, selectedColonyId, onSelectColony }) {
  const list = document.createElement("div");
  list.className = "colony-list";

  colonies.forEach((colony) => {
    list.append(
      ColonyListItem({
        colony,
        isSelected: colony.id === selectedColonyId,
        onSelect: onSelectColony,
      }),
    );
  });

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.append(Panel({ title: "Colonies", children: [list] }));

  return {
    element: sidebar,
    update(nextSelectedColonyId) {
      clearChildren(list);
      colonies.forEach((colony) => {
        list.append(
          ColonyListItem({
            colony,
            isSelected: colony.id === nextSelectedColonyId,
            onSelect: onSelectColony,
          }),
        );
      });
    },
  };
}
