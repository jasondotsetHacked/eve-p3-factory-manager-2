import { clearChildren } from "../../utils/dom.js";
import { getPinById } from "../../utils/geometry.js";
import { Button } from "../primitives/Button.js";
import { ColonySidebar } from "../modules/ColonySidebar.js";
import { ColonyMap } from "../modules/ColonyMap.js";
import { PinInspector } from "../modules/PinInspector.js";
import { DashboardLayout } from "../layouts/DashboardLayout.js";
import { beginEveSsoLogin } from "../../data/auth.js";

export function DashboardPage({ mount, colonies, authStatus }) {
  let selectedColonyId = colonies[0]?.id ?? null;
  let selectedPinId = null;

  function selectedColony() {
    return colonies.find((colony) => colony.id === selectedColonyId) ?? colonies[0];
  }

  function selectedPin() {
    const colony = selectedColony();
    return colony && selectedPinId ? getPinById(colony, selectedPinId) : null;
  }

  function render() {
    clearChildren(mount);

    const shell = document.createElement("div");
    shell.className = "app-shell";

    const header = document.createElement("header");
    header.className = "app-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h1");
    title.className = "app-title";
    title.textContent = "PI Factory Manager";
    const subtitle = document.createElement("div");
    subtitle.className = "app-subtitle";
    subtitle.textContent = "EVE Online Planetary Industry planning shell";
    titleWrap.append(title, subtitle);

    const authButton = Button({
      label: authStatus.isAuthenticated ? authStatus.characterName : "Connect EVE SSO",
      variant: "primary",
      onClick: async () => {
        try {
          await beginEveSsoLogin();
        } catch (error) {
          window.alert(error.message);
        }
      },
    });

    header.append(titleWrap, authButton);

    const colony = selectedColony();
    const sidebar = ColonySidebar({
      colonies,
      selectedColonyId,
      onSelectColony: (colonyId) => {
        selectedColonyId = colonyId;
        selectedPinId = null;
        render();
      },
    });

    const main = document.createElement("main");
    main.className = "main-stage";
    if (colony) {
      main.append(
        ColonyMap({
          colony,
          selectedPinId,
          onSelectPin: (pinId) => {
            selectedPinId = pinId;
            render();
          },
        }),
      );
    }

    const inspector = PinInspector({ pin: selectedPin() });
    shell.append(header, DashboardLayout({ sidebar: sidebar.element, main, inspector }));
    mount.append(shell);
  }

  render();
}
