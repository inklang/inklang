# `pdf` (draft)

## Implementation in each languages

- **JS** : LiterateInk/PDFInspector remixed with https://mozilla.github.io/pdf.js/examples/index.html
- **Kotlin** : https://pdfbox.apache.org/ (made in Java, probably compatible with Kotlin)
- **Swift** : https://developer.apple.com/documentation/pdfkit

## Example

```
var pdf_bytes: @std::bytes = response.bytes;
var pdf: @pdf::pdf = await @pdf::from_bytes(pdf_bytes);

var boxes: @std::array<@pdf::box> = pdf.boxes;

for box in boxes {
  @std::print(box.x, box.y, box.width, box.height);
}
```
