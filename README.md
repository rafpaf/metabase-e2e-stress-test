Stress-test e2e tests in CI at Metabase.

![Kapture 2025-06-11 at 10 07 52](https://github.com/user-attachments/assets/4ca634e9-8ef3-48af-a2ba-ff6e18d56686)

# Installation

1. Compile with `tsc`.
2. Make sure you have [`fzf`](https://github.com/junegunn/fzf) installed.
3. Alias `stress` to `$path_to_this_repo/dist/stress-test.js`.
4. Run `stress` in the metabase repo. Pick a spec. This will create a [workflow on Github here](https://github.com/metabase/metabase/actions/workflows/e2e-stress-test-flake-fix.yml).

---

Authors: Nemanja Glumac (@nemanjaglumac) and Raphael Krut-Landau (@rafpaf)
