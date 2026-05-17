export function DashboardLayout({ sidebar, main, inspector }) {
  const layout = document.createElement("div");
  layout.className = "dashboard-layout";
  layout.append(sidebar, main, inspector);
  return layout;
}
