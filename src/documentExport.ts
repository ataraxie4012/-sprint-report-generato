type DocumentExport = {
  title: string;
  kind: string;
  date: string;
  participants?: string;
  sections: { title: string; text: string }[];
  metadata: { label: string; value: string }[];
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const multiline = (value: string) => escapeHtml(value || "—").replace(/\r?\n/g, "<br>");

export function documentHtml({ title, kind, date, participants, sections, metadata }: DocumentExport) {
  const dateText = date
    ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";
  const metadataRows = metadata.map(({ label, value }) => `
    <tr>
      <th scope="row" align="left" style="padding:12px;font-size:12px;color:#555;border-bottom:1px solid #e5e5e5;width:40%;">${escapeHtml(label)}</th>
      <td style="padding:12px;font-size:13px;color:#222;border-bottom:1px solid #e5e5e5;word-break:break-word;">${multiline(value)}</td>
    </tr>`).join("");
  const body = sections.map((section, index) => `
    <tr><td style="padding:10px 32px 25px;">
      <div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">
        ${String(index + 1).padStart(2, "0")} / ${escapeHtml(section.title.toUpperCase())}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f7f7f7;border-left:4px solid #111;">
        <tr><td style="padding:18px 20px;font-size:13px;line-height:23px;color:#333;word-break:break-word;">
          ${multiline(section.text)}
        </td></tr>
      </table>
    </td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - ${escapeHtml(kind)}</title></head>
<body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#171717;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;">
<tr><td align="center" style="padding:30px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fff;border-collapse:collapse;table-layout:fixed;">
<tr><td style="background:#111;padding:36px 32px;">
<div style="font-size:11px;letter-spacing:3px;color:#aaa;margin-bottom:18px;">${escapeHtml(kind.toUpperCase())}</div>
<div style="font-size:30px;line-height:38px;font-weight:bold;color:#fff;word-break:break-word;">${escapeHtml(title)}</div>
</td></tr>
<tr><td style="padding:30px 32px;font-size:13px;line-height:23px;color:#444;">
Bonjour à tous,<br><br>Voici le ${escapeHtml(kind.toLowerCase())}${dateText ? " du " + escapeHtml(dateText) : ""}.
${participants !== undefined ? `<br><br><strong>Participants</strong><br>${multiline(participants)}` : ""}
</td></tr>
${metadata.length ? `<tr><td style="padding:0 32px 25px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">CONFIGURATION DE TEST</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">${metadataRows}</table>
</td></tr>` : ""}
${body}
<tr><td style="padding:28px 32px;background:#111;color:#fff;">
<div style="font-size:13px;line-height:22px;color:#eee;">Bonne journée à tous,</div>
<div style="font-size:11px;color:#999;margin-top:18px;letter-spacing:1px;">SPRINTLY · WEBWAG</div>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
