import { getAuthStatus } from "./data/auth.js";
import { mockColonies } from "./data/mock-colonies.js";
import { qs } from "./utils/dom.js";
import { DashboardPage } from "./ui/pages/DashboardPage.js";

DashboardPage({
  mount: qs("#app"),
  colonies: mockColonies,
  authStatus: getAuthStatus(),
});
