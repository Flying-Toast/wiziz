# Sorcerio
Play Sorcerio at [sorcer.io](https://sorcer.io).

---

## Building
Sorcerio is written in D. In order to compile it, you need DMD (the D compiler) and dub (the D package/build manager). Both of these can be downloaded from [dlang.org](https://dlang.org).

### Linux + macOS
#### Prerequisites
- [DMD](https://dlang.org)
- dub (automatically installed with DMD)

#### Build Instructions
1. Clone the git repo: `git clone https://github.com/Flying-Toast/sorcerio`.
2. `cd sorcerio`.
3. Compile and run with `dub run` (this will also automatically fetch dependencies).
4. Navigate to ht<span>tp://localhost:8080 in a web browser to test/preview changes.

---

### Windows
Sorcerio is not tested on Windows, so there are no guarantees that these instructions will work.
#### Prerequisites
- [git for windows](https://gitforwindows.org)
- DMD & dub (use the [Windows installer](https://dlang.org))

### Build Instructions
1. Open PowerShell.
2. Clone the git repo: `git clone https://github.com/Flying-Toast/sorcerio`.
3. `cd .\sorcerio`.
4. Compile and run with `dub run --arch=x86_mscoff`.
5. If you get a dialog about Windows Firewall, click allow.
6. Navigate to ht<span>tp://localhost:8080 in a web browser to test/preview changes.

---
