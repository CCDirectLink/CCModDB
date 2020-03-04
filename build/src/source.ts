import stream from 'stream';
import yauzl from 'yauzl';
import { download, streamToBuffer } from './download';

export async function get(input: InputLocation): Promise<[PkgMetadata, InputLocation]> {
	switch (input.type) {
	case 'modZip':
		return [await getModZip(input), input];
	default:
		throw new Error(`Unknown location type '${input.type}'`);
	}
}

async function getModZip(zip: ModZipInputLocation): Promise<PkgMetadata> {
	const file = await download(zip.urlZip);
	const buf = await streamToBuffer(file);
	if (buf.length === 0) {
		throw new Error();
	}
	const archive = await open(buf);
	const stream = await openFile(archive, modZipPath(zip));
	const rawPkg = await streamToBuffer(stream);

	archive.close();

	return JSON.parse(rawPkg as unknown as string) as PkgMetadata;
}

function modZipPath(zip: ModZipInputLocation): string {
	if (zip.packageJSONPath) {
		return zip.packageJSONPath;
	}
	if (zip.source) {
		return `${zip.source}/package.json`;
	}
	return 'package.json';
}

function open(buffer: Buffer): Promise<yauzl.ZipFile> {
	return new Promise((resolve, reject) => {
		yauzl.fromBuffer(buffer, {autoClose: true, lazyEntries: true, decodeStrings: true}, (err, zip) => {
			if (err || !zip) {
				return reject(err);
			}
			resolve(zip);
		});
	});
}

function openFile(zip: yauzl.ZipFile, file: string): Promise<stream.Readable> {
	return new Promise((resolve, reject) => {
		zip.readEntry();
		zip
			.on('entry', (entry: yauzl.Entry) => {
				if (entry.fileName.endsWith('/')) {
					zip.readEntry();
				} else {
					if (entry.fileName === file) {
						zip.openReadStream(entry, (err, result) => {
							if (err) {
								return reject(err);
							}
							resolve(result);
						});
					} else {
						zip.readEntry();
					}
				}
			})
			.on('end', () => reject(new Error('package.json not found')))
			.on('error', (err) => reject(err));
	});
}
