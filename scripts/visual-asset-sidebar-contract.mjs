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

export function hasCurrentSidebarThreadAbsenceEvidence(observation) {
  return (
    observation !== null &&
    typeof observation === "object" &&
    Number.isInteger(observation.recentsSectionCount) &&
    observation.recentsSectionCount === 1 &&
    Number.isInteger(observation.recentsTaskActionRowCount) &&
    observation.recentsTaskActionRowCount >= 2 &&
    Number.isInteger(observation.recentsTaskLeadingSvgCount) &&
    observation.recentsTaskLeadingSvgCount === 0
  );
}
