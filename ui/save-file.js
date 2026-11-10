// Saving a file made in the app (an export) to this device: the browser's
// own download, from text held in memory. Nothing is sent anywhere.

/** Offer text as a file named `name`. */
export function saveFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
