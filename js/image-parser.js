async function getImage(element, image) {
	const response = await fetch(image);
	const arrayBuffer = await response.arrayBuffer();
	const pngData = await displayPDIImage(arrayBuffer);

	element.style.width = pngData.width;
	element.style.height = pngData.height;
	element.src = pngData.data;
}

function convertImageToBase64(file, callback) {
  const reader = new FileReader();

  reader.onloadend = function() {
	// When the file reading is done, call the callback function with the base64 data
	callback(reader.result);
  };

  reader.readAsDataURL(file);
}

function displayPDIImage(arrayBuffer) {
	const dataView = new DataView(arrayBuffer);

	// Parse PDI header
	const ident = new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 12));
	if (ident !== 'Playdate IMG') {
		alert('Invalid PDI file');
		return;
	}

	const flags = dataView.getUint32(12, true); // little-endian
	let offset = 16;

	// Handle compression if needed
	if (flags & 0x80000000) {
		// Decompress using zlib
		const size = dataView.getUint32(offset, true); // little-endian
		const width = dataView.getUint32(offset + 4, true); // little-endian
		const height = dataView.getUint32(offset + 8, true); // little-endian
		offset += 16;

		// Decompress the image data
		const compressedData = new Uint8Array(arrayBuffer, offset);
		const decompressedData = pako.inflate(compressedData);

		return parseImageCell(decompressedData.buffer, 0, width, height);
	} else {
		return parseImageCell(arrayBuffer, offset);
	}
}

function parseImageCell(buffer, offset, width = null, height = null) {
	const dataView = new DataView(buffer, offset);

	const clipWidth = dataView.getUint16(0, true); // little-endian
	const clipHeight = dataView.getUint16(2, true); // little-endian
	const stride = dataView.getUint16(4, true); // little-endian
	const clipLeft = dataView.getUint16(6, true); // little-endian
	const clipRight = dataView.getUint16(8, true); // little-endian
	const clipTop = dataView.getUint16(10, true); // little-endian
	const clipBottom = dataView.getUint16(12, true); // little-endian
	const flags = dataView.getUint16(14, true); // little-endian

	const usesTransparency = (flags & 0x3) > 0;

	const finalWidth = width ?? (clipLeft + clipWidth + clipRight);
	const finalHeight = height ?? (clipTop + clipHeight + clipBottom);

	const imageData = new Uint8ClampedArray(finalWidth * finalHeight * 4);

	const colorDataOffset = 16;
	const alphaDataOffset = colorDataOffset + (stride * clipHeight);
	let pixelIndex = 0;

	for (let y = 0; y < clipHeight; y++) {
		for (let x = 0; x < clipWidth; x++) {
			const byteIndex = Math.floor(pixelIndex / 8);
			const bitIndex = 7 - (pixelIndex % 8);

			if (colorDataOffset + byteIndex >= buffer.byteLength) {
				console.error('Color data byte offset out of range:', colorDataOffset + byteIndex);
				pixelIndex++;
				continue;
			}
			const colorBit = (dataView.getUint8(colorDataOffset + byteIndex) >> bitIndex) & 0x1;

			let alphaBit = 1;
			if (usesTransparency) {
				if (alphaDataOffset + byteIndex >= buffer.byteLength) {
					console.error('Alpha data byte offset out of range:', alphaDataOffset + byteIndex);
					pixelIndex++;
					continue;
				}
				alphaBit = (dataView.getUint8(alphaDataOffset + byteIndex) >> bitIndex) & 0x1;
			}

			const canvasX = clipLeft + x;
			const canvasY = clipTop + y;
			const imageDataIndex = (canvasY * finalWidth + canvasX) * 4;

			imageData[imageDataIndex] = colorBit * 255;
			imageData[imageDataIndex + 1] = colorBit * 255;
			imageData[imageDataIndex + 2] = colorBit * 255;
			imageData[imageDataIndex + 3] = alphaBit * 255;

			pixelIndex++;
		}
		pixelIndex = (y + 1) * stride * 8; // Move to the next row
	}

	// Create a canvas to draw the image and convert it to a data URL
	const canvas = document.createElement('canvas');
	canvas.width = finalWidth;
	canvas.height = finalHeight;
	const ctx = canvas.getContext('2d');
	const imgData = new ImageData(imageData, finalWidth, finalHeight);
	ctx.putImageData(imgData, 0, 0);

	const dataURL = canvas.toDataURL();

	return ({
		width: finalWidth,
		height: finalHeight,
		data: dataURL
	});
}