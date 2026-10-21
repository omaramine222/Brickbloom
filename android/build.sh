#!/bin/bash
# Builds signed Brickbloom.apk without Gradle. Needs JAVA_HOME, ANDROID_HOME, and android-keys/release.jks + android-keys/keystore.env
set -e; cd "$(dirname "$0")"; BT=$ANDROID_HOME/build-tools/34.0.0; PJ=$ANDROID_HOME/platforms/android-34/android.jar
source ../android-keys/keystore.env
rm -rf build; mkdir -p build/gen build/obj build/dex build/res ../dist
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -I $PJ --manifest AndroidManifest.xml -o build/base.apk --java build/gen build/res.zip --min-sdk-version 24 --target-sdk-version 34
javac --release 8 -classpath $PJ -d build/obj $(find src build/gen -name '*.java') 2>&1 | grep -v warning || true
$BT/d8 --release --lib $PJ --min-api 24 --output build/dex $(find build/obj -name '*.class')
cp build/base.apk build/unsigned.apk; python3 -c "import zipfile;zipfile.ZipFile('build/unsigned.apk','a').write('build/dex/classes.dex','classes.dex')"
$BT/zipalign -f -p 4 build/unsigned.apk build/aligned.apk
$BT/apksigner sign --ks ../android-keys/release.jks --ks-pass env:KS_PASS --key-pass env:KS_PASS --out ../dist/Brickbloom.apk build/aligned.apk
echo built ../dist/Brickbloom.apk
