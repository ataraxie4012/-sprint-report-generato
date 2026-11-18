export type WorkspaceRoute = "sprint" | "documents";

// Adresses qui ouvrent directement le rapport de sprint.
// Cette configuration pilote la démonstration. Les droits réels devront être
// vérifiés par le service d’authentification.
export const directSprintEmails: string[] = [
  "manon.fargues@webwag.com",
  "mathieu.lauga@webwag.com",
  "victoria.falcon@webwag.com",
  "denisb@webwag.com",
];

export const documentEmails: string[] = [
  "nour.ouaamou@webwag.com",
  "quentin.fauchie@webwag.com",
  "franckg@webwag.com",
  "mathieu.lauga@webwag.com",
  "justin.berque@webwag.com",
  "saifeddine.jouini@webwag.com",
  "alexandre.perrot-pousset@webwag.com",
  "cse@webwag.com",
  "server@webwag.com",
  "bastien.noirant@webwag.com",
  "denisb@webwag.com",
  "benjamin.duhieu@webwag.com",
  "melanie.bessagnet@webwag.com",
  "benoit.fourre@webwag.com",
  "aurelien.satger@webwag.com",
  "webwag@webwag.com",
  "jpillot@webwag.com",
  "rahma.bounawara@webwag.com",
  "manon.bobin@webwag.com",
  "laurentm@webwag.com",
  "olivier.cadet@webwag.com",
  "eddy.galou@webwag.com",
  "annelinh.nguyen@webwag.com",
  "christophe.boue@webwag.com",
  "dev.ia@webwag.com",
  "webwag.com@allusers.d.calendar.google.com",
  "marc.moussu@webwag.com",
  "thomas.samy@webwag.com",
  "romain.gary@webwag.com",
  "damien.gracia@webwag.com",
  "victoria.falcon@webwag.com",
  "all@webwag.com",
  "adv@webwag.com",
  "nima.barati@webwag.com",
  "xavier.lacoste@webwag.com",
  "nicolas.patin@webwag.com",
  "romaind@webwag.com",
  "site@webwag.com",
  "edouard.puillandre@webwag.com",
  "pierre.garnier@webwag.com",
  "riyane.el-mouslih@webwag.com",
  "matthieu.cormelier@webwag.com",
  "bastien.lebrun@webwag.com",
  "amine.andolsi@webwag.com",
  "virginie.dasilva@webwag.com",
  "manon.fargues@webwag.com",
];

export function workspaceForEmail(email: string): WorkspaceRoute {
  const normalizedEmail = email.trim().toLowerCase();
  return directSprintEmails.some(
    (address) => address.trim().toLowerCase() === normalizedEmail
  ) ? "sprint" : "documents";
}

export function canOpenBothWorkspaces(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return directSprintEmails.includes(normalizedEmail)
    && documentEmails.includes(normalizedEmail);
}
