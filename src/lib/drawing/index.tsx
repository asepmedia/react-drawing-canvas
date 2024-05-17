import { useCallback, useEffect, useRef, useState } from "react";
import RdcDarkMode from "../icons/RdcDarkMode";
import Rdchand from "../icons/RdcHand";
import RdcLeftSidebar from "../icons/RdcLeftSidebar";
import RdcLightMode from "../icons/RdcLightMode";
import RdcPen from "../icons/RdcPen";
import RdcPointer from "../icons/RdcPointer";
import RdcRightSidebar from "../icons/RdcRightSidebar";
import "../styles/style.scss";
import cn from "../utils/cn";

const POINTER_TOOL = 1;
const PEN_TOOL = 2;
const HAND_TOOL = 3;
const tools: {
  name: number;
  icon: JSX.Element;
}[] = [
  {
    name: POINTER_TOOL,
    icon: <RdcPointer width={20} />,
  },
  {
    name: PEN_TOOL,
    icon: <RdcPen width={20} />,
  },
  {
    name: HAND_TOOL,
    icon: <Rdchand width={20} />,
  },
];

function Toolbar() {
  const [selectedTool, setSelectedTool] = useState(POINTER_TOOL);
  return (
    <>
      {tools.map((tool) => (
        <div
          role="button"
          className={cn("item", {
            active: selectedTool === tool.name,
          })}
          key={tool.name}
          onClick={() => setSelectedTool(tool.name)}
        >
          {tool.icon}
        </div>
      ))}
    </>
  );
}

interface DrawingProps {
  mode?: "light" | "dark";
}

interface Path {
  x: number;
  y: number;
  type: "rect" | "circle" | "line" | "text";
  meta: {
    color?: string;
    width?: number;
    height?: number;
  };
}

export function Drawing(props: DrawingProps) {
  const { mode = "dark" } = props;
  const [isDarkMode, setIsDarkMode] = useState(mode === "dark");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(
    null
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);

        const foundIndex = paths.findIndex((path) => {
          if (path.type === "rect") {
            return (
              x >= path.x &&
              x <= path.x + (path.meta.width || 0) &&
              y >= path.y &&
              y <= path.y + (path.meta.height || 0)
            );
          }
          return false;
        });

        if (foundIndex !== -1) {
          setSelectedPathIndex(foundIndex);
        } else {
          setSelectedPathIndex(null);
        }
      }
    },
    [canvasRef, paths]
  );

  const ctx = useCallback(() => {
    const canvas = canvasRef.current;
    const ctxx = canvas?.getContext("2d");
    if (ctxx) {
      return ctxx;
    }
    return null;
  }, [canvasRef]);

  const draw = useCallback(() => {
    const c = ctx();
    if (c) {
      c.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

      paths.forEach((path, index) => {
        switch (path.type) {
          case "rect":
            c.fillStyle = path.meta.color || "black";
            c.fillRect(
              path.x,
              path.y,
              path.meta.width || 0,
              path.meta.height || 0
            );
            if (index === selectedPathIndex) {
              c.strokeStyle = "#3b82f6";
              c.setLineDash([6, 6]);
              c.lineWidth = 2;
              c.strokeRect(
                path.x,
                path.y,
                path.meta.width || 0,
                path.meta.height || 0
              );
            }
            break;
          default:
            break;
        }
      });
    }
  }, [paths, selectedPathIndex, ctx]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
      }

      canvas.addEventListener("click", handleClick);
      return () => {
        canvas.removeEventListener("click", handleClick);
      };
    }
  }, [handleClick]);

  useEffect(() => {
    draw();
  }, [paths, draw]);

  return (
    <div
      className={cn("react_drawing_canvas", {
        light: !isDarkMode,
      })}
    >
      <div className="wrapper">
        <div className="topbar">
          <div
            role="button"
            className="toolbar"
            style={{
              width: "30%",
              height: "100%",
            }}
            onClick={() => {
              setPaths((prev) => [
                ...prev,
                {
                  x: Math.floor(Math.random() * 1000),
                  y: Math.floor(Math.random() * 1000),
                  type: "rect",
                  meta: {
                    color: "#155e75",
                    width: 200,
                    height: 200,
                  },
                },
              ]);
            }}
          >
            <Toolbar />
          </div>
          <div>
            <span className="muted"> Drafts</span> /{" "}
            <span className="bold"> Untitled</span>
          </div>
          <div
            style={{
              width: "30%",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            <button
              className="button text"
              onClick={() => {
                setIsDarkMode((prev) => !prev);
              }}
            >
              {isDarkMode ? (
                <RdcLightMode width={20} />
              ) : (
                <div>
                  <RdcDarkMode width={20} />
                </div>
              )}
            </button>
            <button
              className="button text"
              onClick={() => {
                setShowLeftSidebar((prev) => !prev);
              }}
            >
              <RdcLeftSidebar width={20} />
            </button>
            <button
              className="button text"
              onClick={() => {
                setShowRightSidebar((prev) => !prev);
              }}
            >
              <RdcRightSidebar width={20} />
            </button>
            <button className="button">Save</button>
          </div>
        </div>
        <div className="editor">
          <div className="sidebar"></div>
          <div
            className="content"
            style={{
              padding: "20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                border: "1px solid #aaa",
                width: "100%",
                height: "100%",
                cursor: selectedPathIndex !== null ? "move" : "default",
              }}
            ></canvas>
          </div>
          <div className="right sidebar"></div>
        </div>
      </div>
    </div>
  );
}
