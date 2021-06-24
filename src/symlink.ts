import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import sudo from 'sudo-prompt';

export function getExtensionPath() {
	if (process.platform == 'darwin') {
		return path.join(os.homedir(), '/Library/Application Support/Adobe/CEP/extensions');
	} else {
		return path.join(process.env.APPDATA || '', 'Adobe/CEP/extensions');
	}
}

function getSymlinkExtensionPath({ bundleId }: { bundleId: string }) {
	const extensionPath = getExtensionPath();
	return path.join(extensionPath, bundleId);
}

export function symlinkExtension({ bundleId, out, root }: { bundleId: string; out: string; root: string }) {
	const symlinkPath = getSymlinkExtensionPath({ bundleId });
	const symlinkTarget = path.join(root, out, '/');
	return Promise.resolve()
		.then(() => fs.ensureDir(getExtensionPath()))
		.then(() => {
			let needsNewLink = true;
			if (fs.existsSync(symlinkPath)) {
				let fileStats = fs.lstatSync(symlinkPath);
				if (fileStats.isSymbolicLink()) {
					let testedLinkTarget = fs.readlinkSync(symlinkPath);
					if (path.join(testedLinkTarget, '/') === symlinkTarget) needsNewLink = false;
				}
			}
			if (needsNewLink) {
				fs.removeSync(symlinkPath);
				if (process.platform === 'win32') {
					console.log(symlinkTarget);
					console.log(symlinkPath);
					var sudoOptions = {
						name: 'Make symbolic link',
					};
					sudo.exec(
						`node -e "require('fs').symlink('${symlinkTarget.replace(
							/\\+/g,
							'\\\\',
						)}', '${symlinkPath.replace(/\\+/g, '\\\\')}', 'dir', (err) => {if (err) throw err;})"`,
						sudoOptions,
						function (error, stdout, stderr) {
							if (error) throw error;
						},
					);
					return;
				} else {
					return fs.symlink(path.join(out, '/'), symlinkPath);
				}
			}
		});
}
