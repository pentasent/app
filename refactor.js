const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            if (dirPath.endsWith('.tsx') && !dirPath.includes('CustomImage.tsx')) {
                callback(dirPath);
            }
        }
    });
}

const targetDirs = [
    path.join(__dirname, 'app'),
    path.join(__dirname, 'components'),
    // path.join(__dirname, 'dump')
];

targetDirs.forEach(dir => {
    walkDir(dir, function (filePath) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if we import Image from 'react-native'
        const match = content.match(/import\s+{([^}]*Image[^}]*)}\s+from\s+['"]react-native['"]/);
        if (match) {
            let importedNamed = match[1];
            let hasImage = false;

            const newImportNamed = importedNamed.split(',').map(item => {
                if (item.trim() === 'Image') {
                    hasImage = true;
                    return null; // remove it
                }
                return item;
            }).filter(item => item !== null).join(',');

            if (hasImage) {
                // Replace the old import block
                if (newImportNamed.trim() === '') {
                    content = content.replace(match[0], '');
                } else {
                    content = content.replace(match[0], `import {${newImportNamed}} from 'react-native'`);
                }

                // Ensure @/components/CustomImage is imported
                const customImageImport = `import { CustomImage as Image } from '@/components/CustomImage';\n`;
                // insert after the last react-native import or at the top
                content = customImageImport + content;

                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${filePath}`);
            }
        }
    });
});
