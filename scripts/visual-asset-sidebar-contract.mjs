export function hasCurrentSidebarAbsenceEvidence(observation) {
  return (
    observation !== null &&
    typeof observation === "object" &&
    Number.isInteger(observation.footerHelpControlCount) &&
    observation.footerHelpControlCount === 1 &&
    Number.isInteger(observation.settingsControlCount) &&
    observation.settingsControlCount === 0 &&
    Number.isInteger(observation.taskActionRowCount) &&
    observation.taskActionRowCount >= 2 &&
    Number.isInteger(observation.threadLeadingSvgCount) &&
    observation.threadLeadingSvgCount === 0
  );
}
