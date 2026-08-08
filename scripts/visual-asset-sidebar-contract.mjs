export function hasCurrentSidebarSettingsAbsenceEvidence(observation) {
  return (
    observation !== null &&
    typeof observation === "object" &&
    Number.isInteger(observation.footerHelpControlCount) &&
    observation.footerHelpControlCount === 1 &&
    Number.isInteger(observation.settingsControlCount) &&
    observation.settingsControlCount === 0
  );
}
