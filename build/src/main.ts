import * as inputLocations from './inputLocations';
import * as source from './source';
import * as db from './db';

async function main() {
	const locations = await inputLocations.parse();
	const promises: Promise<[PackageDBPackageMetadata, InputLocation]>[] = [];
	for (const loc of locations) {
		promises.push(source.get(loc));
	}
	const packages = await Promise.all(promises);

	await db.write(await db.build(packages));
}

main().catch(err => console.error('error: ', err));
