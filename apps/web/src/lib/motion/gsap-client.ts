"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

// GSAP React plugin'i tek yerde register edilerek hook kullanan dosyalarda tekrar edilmez.
gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
