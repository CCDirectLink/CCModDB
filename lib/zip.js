'use strict';

const zlib = require('zlib');

class ZipEntry {
	constructor(buffer, cdOffset) {
		const fnLen = buffer.readUInt16LE(cdOffset + 28);
		const stuffLen =
			buffer.readUInt16LE(cdOffset + 30) + // extra field length
			buffer.readUInt16LE(cdOffset + 32); // file comment length

		const fnOffset = cdOffset + 46;
		this.nextCDOffset = fnOffset + fnLen + stuffLen;

		// If it's not UTF-8, it's probably going to be broken anyway.
		// Such is the life of ZIP.
		// Officially (APPNOTE-wise), it's "UTF-8 or codepage 437".
		// This is complete nonsense in practice.
		this.name = buffer.slice(fnOffset, fnOffset + fnLen).toString('utf8');
		this.compression = buffer.readUInt16LE(cdOffset + 10);

		const lhOffset = buffer.readUInt32LE(cdOffset + 42);

		if (buffer.readUInt32LE(lhOffset) !== 0x04034b50)
			throw new Error('Local header signature wrong for ' + this.name);
		const lhStuffLen =
			buffer.readUInt16LE(lhOffset + 26) + // filename length
			buffer.readUInt16LE(lhOffset + 28); // extra field length

		this.size = buffer.readUInt32LE(lhOffset + 22);
		this.compressedSize = buffer.readUInt32LE(lhOffset + 18);
		this.compressedDataOffset = lhOffset + 30 + lhStuffLen;
		this.compressedDataSlice = buffer.slice(this.compressedDataOffset,
			this.compressedDataOffset + this.compressedSize);
	}
	get data() {
		if (this.compression === 0)
			return this.compressedDataSlice;
		if (this.compression === 8)
			return zlib.inflateRawSync(this.compressedDataSlice);
		throw new Error('Unsupported ZIP compression ' + this.compression);
	}
}

function scanZip(buffer) {
	let endOfCDOfs;
	for (endOfCDOfs = buffer.length - 22; endOfCDOfs >= 0; endOfCDOfs--) {
		if (buffer.readUInt32LE(endOfCDOfs) !== 0x06054b50)
			continue;
		break;
	}
	if (endOfCDOfs === -1)
		throw new Error('Unable to find end of central directory');
	const startCDEntries = buffer.readUInt16LE(endOfCDOfs + 10);
	let currentCDOffset = buffer.readUInt32LE(endOfCDOfs + 16);
	const entries = [];
	for (let i = 0; i < startCDEntries; i++) {
		let entry = new ZipEntry(buffer, currentCDOffset);
		currentCDOffset = entry.nextCDOffset;
		entries.push(entry);
	}
	return entries;
}

module.exports = scanZip;
