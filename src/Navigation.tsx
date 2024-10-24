import React, { useEffect, useMemo, useRef, useState } from "react";
import { SketchList } from "./Wrapper";
import t1 from "./assets/3.jpg?url";
import t2 from "./assets/61734.png?url";
import debounce from "lodash.debounce";
import { useNavigate } from "react-router-dom";

const itemWidth = 250;
const itemHeight = 150;
const isDev = import.meta.env.DEV;

const Navigation = () => {
    const navigate = useNavigate();
    const gridRef = useRef<HTMLDivElement>(null);
    const [total, setTotal] = useState({
        cols: Math.floor(window.innerWidth / itemWidth),
        rows: Math.floor(window.innerHeight / itemHeight),
        max: Math.floor((window.innerWidth / itemWidth) * (window.innerHeight / itemHeight)),
    });

    useEffect(() => {
        // set css variable with max width
        document.documentElement.style.setProperty("--cols", `${total.cols}`);
        document.documentElement.style.setProperty("--rows", `${total.rows}`);

        const img = new Image();
        const img2 = new Image();
        img2.src = t2;
        img.src = t1;
        img.onload = () => {
            const gridItems = gridRef.current?.querySelectorAll(
                ".grid-item"
            ) as NodeListOf<HTMLDivElement>;
            const rows = total.rows;
            const columns = total.cols;

            // calculate offset for each card to create a grid of 1 image
            gridItems.forEach((item, index) => {
                const chields = [...item.querySelectorAll(".grid-item__panel")];
                const frontElem = chields.find(
                    c => c.dataset.panelItem === "front"
                ) as HTMLDivElement;
                const backElem = chields.find(
                    c => c.dataset.panelItem === "back"
                ) as HTMLDivElement;
                if (!frontElem || !backElem) return;

                // get position of the card and set background position, need to fit all cards with the same image like puzzle
                const xPos = (index % columns) * -itemWidth;
                const yPos = Math.floor(index / columns) * -itemHeight;

                const bgSize = `${columns * 100}% ${rows * 100}%`;
                const bgPosition = `${xPos}px ${yPos}px`;

                frontElem.style.backgroundImage = `url(${img.src})`;
                frontElem.style.backgroundSize = bgSize;
                frontElem.style.backgroundPosition = bgPosition;
                backElem.style.backgroundImage = `url(${img2.src})`;
                backElem.style.backgroundSize = bgSize;
                backElem.style.backgroundPosition = bgPosition;
            });
        };
    }, [total]);

    useEffect(() => {
        // setup resize observer to update grid size
        const resizeObserver = new ResizeObserver(() => {
            const cols = Math.floor(window.innerWidth / itemWidth);
            const rows = Math.floor(window.innerHeight / itemHeight);
            const max = Math.floor(
                (window.innerWidth / itemWidth) * (window.innerHeight / itemHeight)
            );

            document.documentElement.style.setProperty("--cols", `${cols}`);
            document.documentElement.style.setProperty("--rows", `${rows}`);
            gridRef.current!.dataset.hover = "false";

            setTotal({ cols, rows, max });
        });

        // initial call
        resizeObserver.observe(document.body);
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const cards = useMemo(() => [...Array(total.max)], [total.max]);

    const handleWheel = (e: React.WheelEvent) => {
        // select randonly grid cards and set hover to true
        const gridItems = gridRef.current?.querySelectorAll(
            ".grid-item"
        ) as NodeListOf<HTMLDivElement>;
        const randomIndex = Math.floor(Math.random() * gridItems.length);
        gridItems[randomIndex].dataset.hover = "true";

        // set hover to false after 1s
        debounce(() => {
            gridItems[randomIndex].dataset.hover = "false";
        }, 1000)();
    };

    const wait = async (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    const handleBeforeStart = async () => {
        const gridItems = gridRef.current?.querySelectorAll(
            ".grid-item"
        ) as NodeListOf<HTMLDivElement>;

        for (let i = 0; i < gridItems.length; i++) {
            const gridItem = gridItems[i];

            if (gridItem.dataset.hover === "true") {
                gridItem.dataset.hover = "false";
                await wait(10);
            }
            gridItem.dataset.hover = "true";
            await wait(10);
        }
    };

    const handleGo = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        e.preventDefault();
        handleBeforeStart();
        await wait(600);
        navigate(path);
    };

    const stalkerRef = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLElement) {
            const rect = e.target?.getBoundingClientRect() as DOMRect;

            // set width and height of the stalker
            const w = rect.width + 8;
            const h = rect.height + 8;
            stalkerRef.current!.style.width = `${w}px`;
            stalkerRef.current!.style.height = `${h}px`;

            // set position of the stalker
            const top = rect.top - 4;
            const left = rect.left - 4;
            stalkerRef.current!.style.top = `${top}px`;
            stalkerRef.current!.style.left = `${left}px`;
        }
    };

    return (
        <div
            onMouseEnter={() => {
                gridRef.current.dataset.hover = "true";
            }}
            onMouseLeave={() => {
                gridRef.current.dataset.hover = "false";
            }}
            className="nav-container">
            <nav className="nav">
                <a
                    onClick={e => handleGo(e, "/" + SketchList["GPGPU"])}
                    onMouseEnter={handleMouseEnter}
                    href={"/" + SketchList["GPGPU"]}>
                    GPGPU City
                </a>
                <a
                    onClick={e => handleGo(e, "/" + SketchList["R3FB"])}
                    onMouseEnter={handleMouseEnter}
                    href={"/" + SketchList["R3FB"]}>
                    螺旋
                </a>
                <a
                    onClick={e => handleGo(e, "/" + SketchList["Particle emitter"])}
                    onMouseEnter={handleMouseEnter}
                    href={"/" + SketchList["Particle emitter"]}>
                    Flying Emitters
                </a>
                <a
                    onClick={e => handleGo(e, "/" + SketchList["R3FGPGPU"])}
                    onMouseEnter={handleMouseEnter}
                    href={"/" + SketchList["R3FGPGPU"]}>
                    GPGPU Maze
                </a>
                <a
                    onClick={e => handleGo(e, "/" + SketchList["WebGLSlider"])}
                    onMouseEnter={handleMouseEnter}
                    href={"/" + SketchList["WebGLSlider"]}>
                    WebGl slider
                </a>
                {isDev && (
                    <a onMouseEnter={handleMouseEnter} href={"/" + SketchList["Bounce"]}>
                        Physics
                    </a>
                )}
            </nav>

            <span ref={stalkerRef} className="stalker"></span>

            <div ref={gridRef} onWheel={handleWheel} className="nav-grid">
                {cards.map((_, i) => {
                    return (
                        <div
                            onMouseEnter={e => {
                                e.currentTarget.dataset.hover = "true";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.dataset.hover = "false";
                            }}
                            key={i}
                            className="grid-item">
                            <div data-panel-item="back" className="grid-item__panel"></div>
                            <div data-panel-item="front" className="grid-item__panel"></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Navigation;
