import { clearChildren } from "../../utils/dom.js";
import { getPinById } from "../../utils/geometry.js";
import { Button } from "../primitives/Button.js";
import { ColonySidebar } from "../modules/ColonySidebar.js";
import { ColonyMap } from "../modules/ColonyMap.js";
import { PinInspector } from "../modules/PinInspector.js";
import { DashboardLayout } from "../layouts/DashboardLayout.js";
import { beginEveSsoLogin, getAuthStatus, getAuthSession, logout } from "../../data/auth.js";

export function DashboardPage({ mount, colonies, authStatus, dataSource = "auth-required", loadError = null }) {
  let selectedColonyId = colonies[0]?.id ?? null;
  let selectedPinId = null;
  let previewPinId = null;
  let currentAuthStatus = authStatus;

  function selectedColony() {
    return colonies.find((colony) => colony.id === selectedColonyId) ?? colonies[0];
  }

  function selectedPin() {
    const colony = selectedColony();
    return colony && selectedPinId ? getPinById(colony, selectedPinId) : null;
  }

  function activeInspectorPin() {
    const colony = selectedColony();
    return colony ? getPinById(colony, selectedPinId ?? previewPinId) : null;
  }

  function render() {
    mount.querySelectorAll(".map-module").forEach((element) => element.cleanup?.());
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
    subtitle.textContent = dataSource === "live" ? "Live ESI Planetary Industry colonies" : "Connect EVE SSO to load colonies";
    titleWrap.append(title, subtitle);

    const authActions = document.createElement("div");
    authActions.className = "auth-actions";

    if (currentAuthStatus.isAuthenticated) {
      const authMeta = document.createElement("div");
      authMeta.className = "auth-actions__meta";
      authMeta.textContent = currentAuthStatus.characterName;

      const session = getAuthSession();
      if (session?.characterId) {
        authMeta.title = `Character ID ${session.characterId}`;
      }

      const logoutButton = Button({
        label: "Log out",
        onClick: () => {
          logout();
          currentAuthStatus = getAuthStatus();
          render();
        },
      });

      authActions.append(authMeta, logoutButton);
    } else {
      const authButton = Button({
        label: "Connect EVE SSO",
        variant: "primary",
        onClick: async () => {
          try {
            await beginEveSsoLogin();
          } catch (error) {
            window.alert(error.message);
          }
        },
      });

      authActions.append(authButton);
    }

    header.append(titleWrap, authActions);

    const colony = selectedColony();
    const sidebar = ColonySidebar({
      colonies,
      selectedColonyId,
      dataSource,
      onSelectColony: (colonyId) => {
        selectedColonyId = colonyId;
        selectedPinId = null;
        render();
      },
    });

    const main = document.createElement("main");
    main.className = "main-stage";
    let inspector = null;

    function updateInspector(pinId) {
      selectedPinId = pinId;
      previewPinId = null;
      const nextInspector = PinInspector({ pin: selectedPin() });
      inspector.replaceWith(nextInspector);
      inspector = nextInspector;
    }

    function previewInspector(pinId) {
      if (selectedPinId) {
        return;
      }

      previewPinId = pinId;
      const nextInspector = PinInspector({ pin: activeInspectorPin(), isPreview: Boolean(pinId) });
      inspector.replaceWith(nextInspector);
      inspector = nextInspector;
    }

    function clearInspector() {
      selectedPinId = null;
      previewPinId = null;
      const nextInspector = PinInspector({ pin: null });
      inspector.replaceWith(nextInspector);
      inspector = nextInspector;
    }

    if (colony) {
      main.append(
        ColonyMap({
          colony,
          selectedPinId,
          onSelectPin: updateInspector,
          onPreviewPin: previewInspector,
          onClearPin: clearInspector,
        }),
      );
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = loadError
        ? `Could not load live ESI colonies: ${loadError.message}`
        : "Connect EVE SSO to load live Planetary Industry colonies.";
      main.append(empty);
    }

    inspector = PinInspector({ pin: activeInspectorPin() });
    shell.append(header, DashboardLayout({ sidebar: sidebar.element, main, inspector }));
    mount.append(shell);
  }

  render();
}
