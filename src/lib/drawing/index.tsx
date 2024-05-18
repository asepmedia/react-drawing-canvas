import React, { useCallback, useEffect, useRef, useState } from "react";
import RdcDarkMode from "../icons/RdcDarkMode";
import Rdchand from "../icons/RdcHand";
import RdcImage from "../icons/RdcImage";
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
const IMAGE_TOOL = 4;

const tools: {
  name: number;
  icon: JSX.Element;
}[] = [
  {
    name: IMAGE_TOOL,
    icon: <RdcImage width={20} />,
  },
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

function Toolbar({
  selectedTool,
  setSelectedTool,
  onAddImage,
}: {
  selectedTool: number;
  setSelectedTool: (tool: number) => void;
  onAddImage?: (base64: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === "string") {
          onAddImage?.(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
      {tools.map((tool) => (
        <div
          role="button"
          className={cn("item", {
            active: selectedTool === tool.name,
          })}
          key={tool.name}
          onClick={() => {
            if (tool.name === IMAGE_TOOL) {
              fileRef.current?.click();
            } else {
              setSelectedTool(tool.name);
            }
          }}
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
  zIndex: number;
  type: "rect" | "circle" | "line" | "text" | "image";
  name: string;
  meta: {
    color?: string;
    width?: number;
    height?: number;
  };
}

interface LinePath extends Path {
  points: { x: number; y: number }[];
}

interface ImagePath extends Path {
  src: string;
}

export function Drawing(props: DrawingProps) {
  const { mode = "dark" } = props;
  const [isDarkMode, setIsDarkMode] = useState(mode === "dark");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedPathIndices, setSelectedPathIndices] = useState<number[]>([]);
  const [selectedTool, setSelectedTool] = useState(POINTER_TOOL);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<Path[][]>([]);
  const historyToolRef = useRef<number>(0);
  const imageCache = useRef<any>({});
  const moveStart = useRef({ x: 0, y: 0 });
  const initialPaths = useRef<Path[]>([]);

  const handleAddImage = (base64: string) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const { width, height } = img;
      setPaths((prevPaths) => [
        ...prevPaths,
        {
          x: 50,
          y: 50,
          zIndex: prevPaths.length,
          type: "image",
          name: `Image ${prevPaths.length + 1}`,
          src: base64,
          meta: { width: width * 0.5, height: height * 0.5 },
        } as ImagePath,
      ]);
    };
  };

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x =
          (event.clientX - rect.left) * (canvas.width / rect.width) -
          panOffset.x;
        const y =
          (event.clientY - rect.top) * (canvas.height / rect.height) -
          panOffset.y;

        if (selectedTool === POINTER_TOOL) {
          const foundIndices = paths
            .map((path, index) => {
              if (path.type === "rect" || path.type === "image") {
                if (
                  x >= path.x &&
                  x <= path.x + (path.meta.width || 0) &&
                  y >= path.y &&
                  y <= path.y + (path.meta.height || 0)
                ) {
                  return { index, zIndex: path.zIndex };
                }
              } else if (path.type === "line") {
                const linePath = path as LinePath;
                for (let i = 0; i < linePath.points.length - 1; i++) {
                  const p1 = linePath.points[i];
                  const p2 = linePath.points[i + 1];
                  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                  const d1 = Math.hypot(p2.x - x, p2.y - y);
                  const d2 = Math.hypot(p1.x - x, p1.y - y);
                  if (d1 + d2 >= d - 1 && d1 + d2 <= d + 1) {
                    return { index, zIndex: path.zIndex };
                  }
                }
              }
              return null;
            })
            .filter((val) => val !== null)
            .sort((a, b) => b!.zIndex - a!.zIndex)
            .map((val) => val!.index);

          setSelectedPathIndices(foundIndices);
        }
      }
    },
    [canvasRef, paths, selectedTool, panOffset]
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x =
          (event.clientX - rect.left) * (canvas.width / rect.width) -
          panOffset.x;
        const y =
          (event.clientY - rect.top) * (canvas.height / rect.height) -
          panOffset.y;

        if (selectedTool === PEN_TOOL) {
          setPaths((prevPaths) => {
            const newPaths = [
              ...prevPaths,
              {
                x,
                y,
                zIndex: prevPaths.length,
                type: "line",
                name: `Line ${prevPaths.length + 1}`,
                meta: { color: "#eaeaea" },
                points: [{ x, y }],
              } as LinePath,
            ];
            historyRef.current.push(newPaths);
            return newPaths;
          });
          setIsDrawing(true);
        } else if (selectedTool === HAND_TOOL) {
          setIsPanning(true);
          setPanStart({ x: event.clientX, y: event.clientY });
        } else if (selectedTool === POINTER_TOOL) {
          const foundIndices = paths
            .map((path, index) => {
              if (path.type === "rect" || path.type === "image") {
                if (
                  x >= path.x &&
                  x <= path.x + (path.meta.width || 0) &&
                  y >= path.y &&
                  y <= path.y + (path.meta.height || 0)
                ) {
                  return { index, zIndex: path.zIndex };
                }
              } else if (path.type === "line") {
                const linePath = path as LinePath;
                for (let i = 0; i < linePath.points.length - 1; i++) {
                  const p1 = linePath.points[i];
                  const p2 = linePath.points[i + 1];
                  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                  const d1 = Math.hypot(p2.x - x, p2.y - y);
                  const d2 = Math.hypot(p1.x - x, p1.y - y);
                  if (d1 + d2 >= d - 1 && d1 + d2 <= d + 1) {
                    return { index, zIndex: path.zIndex };
                  }
                }
              }
              return null;
            })
            .filter((val) => val !== null)
            .sort((a, b) => b!.zIndex - a!.zIndex)
            .map((val) => val!.index);

          if (foundIndices.length > 0) {
            setSelectedPathIndices(foundIndices);
            setIsMoving(true);
            moveStart.current = { x, y };
            initialPaths.current = paths;
          } else {
            setSelectionStart({ x, y });
            setSelectionEnd({ x, y });
            setIsSelecting(true);
          }
        }
      }
    },
    [selectedTool, panOffset, paths]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (canvasRef?.current) {
        if (isDrawing && selectedTool === PEN_TOOL) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x =
            (event.clientX - rect.left) * (canvas.width / rect.width) -
            panOffset.x;
          const y =
            (event.clientY - rect.top) * (canvas.height / rect.height) -
            panOffset.y;

          setPaths((prevPaths) => {
            const newPaths = [...prevPaths];
            const currentPath = newPaths[newPaths.length - 1] as LinePath;
            currentPath.points.push({ x, y });
            return newPaths;
          });
        } else if (isPanning && selectedTool === HAND_TOOL) {
          const dx = event.clientX - panStart.x;
          const dy = event.clientY - panStart.y;

          setPanOffset((prevOffset) => ({
            x: prevOffset.x + dx,
            y: prevOffset.y + dy,
          }));

          setPanStart({ x: event.clientX, y: event.clientY });
        } else if (isMoving && selectedTool === POINTER_TOOL) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x =
            (event.clientX - rect.left) * (canvas.width / rect.width) -
            panOffset.x;
          const y =
            (event.clientY - rect.top) * (canvas.height / rect.height) -
            panOffset.y;

          const dx = x - moveStart.current.x;
          const dy = y - moveStart.current.y;

          setPaths(
            initialPaths.current.map((path, index) => {
              if (selectedPathIndices.includes(index)) {
                if (path.type === "line") {
                  const linePath = path as LinePath;
                  const movedPoints = linePath.points.map((point) => ({
                    x: point.x + dx,
                    y: point.y + dy,
                  }));
                  return { ...path, points: movedPoints };
                } else {
                  return { ...path, x: path.x + dx, y: path.y + dy };
                }
              }
              return path;
            })
          );
        } else if (isSelecting && selectedTool === POINTER_TOOL) {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const x =
            (event.clientX - rect.left) * (canvas.width / rect.width) -
            panOffset.x;
          const y =
            (event.clientY - rect.top) * (canvas.height / rect.height) -
            panOffset.y;

          setSelectionEnd({ x, y });
        }
      }
    },
    [
      isDrawing,
      selectedTool,
      panStart,
      isPanning,
      isMoving,
      isSelecting,
      panOffset,
      selectedPathIndices,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
    } else if (isPanning) {
      setIsPanning(false);
    } else if (isMoving) {
      setIsMoving(false);
    } else if (isSelecting) {
      setIsSelecting(false);
      const selectionRect = {
        x1: Math.min(selectionStart.x, selectionEnd.x),
        y1: Math.min(selectionStart.y, selectionEnd.y),
        x2: Math.max(selectionStart.x, selectionEnd.x),
        y2: Math.max(selectionStart.y, selectionEnd.y),
      };

      const foundIndices = paths.reduce((indices, path, index) => {
        if (path.type === "rect" || path.type === "image") {
          const withinSelection =
            path.x >= selectionRect.x1 &&
            path.x + (path.meta.width || 0) <= selectionRect.x2 &&
            path.y >= selectionRect.y1 &&
            path.y + (path.meta.height || 0) <= selectionRect.y2;
          if (withinSelection) {
            indices.push(index);
          }
        } else if (path.type === "line") {
          const linePath = path as LinePath;
          const withinSelection = linePath.points.some(
            (point) =>
              point.x >= selectionRect.x1 &&
              point.x <= selectionRect.x2 &&
              point.y >= selectionRect.y1 &&
              point.y <= selectionRect.y2
          );
          if (withinSelection) {
            indices.push(index);
          }
        }
        return indices;
      }, [] as number[]);

      setSelectedPathIndices(foundIndices);
    }
  }, [
    isDrawing,
    isPanning,
    isMoving,
    isSelecting,
    selectionStart,
    selectionEnd,
    paths,
  ]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (c) {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.translate(panOffset.x, panOffset.y); // Apply the panning offset

      paths
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .forEach((path, index) => {
          switch (path.type) {
            case "rect":
              c.fillStyle = path.meta.color || "black";
              c.fillRect(
                path.x,
                path.y,
                path.meta.width || 0,
                path.meta.height || 0
              );
              if (selectedPathIndices.includes(index)) {
                c.strokeStyle = "#3b82f6";
                c.setLineDash([6, 6]);
                c.lineWidth = 2;
                c.strokeRect(
                  path.x - 2,
                  path.y - 2,
                  (path.meta.width || 0) + 4,
                  (path.meta.height || 0) + 4
                );
              }
              break;
            case "line":
              const linePath = path as LinePath;
              c.strokeStyle = path.meta.color || "black";
              c.lineWidth = 2;
              c.setLineDash([]);
              c.beginPath();
              c.moveTo(linePath.points[0].x, linePath.points[0].y);
              linePath.points.forEach((point) => {
                c.lineTo(point.x, point.y);
              });
              c.stroke();
              if (selectedPathIndices.includes(index)) {
                const minX = Math.min(
                  ...linePath.points.map((point) => point.x)
                );
                const maxX = Math.max(
                  ...linePath.points.map((point) => point.x)
                );

                const minY = Math.min(
                  ...linePath.points.map((point) => point.y)
                );

                const maxY = Math.max(
                  ...linePath.points.map((point) => point.y)
                );
                c.strokeStyle = "#3b82f6";
                c.setLineDash([6, 6]);
                c.lineWidth = 2;
                c.strokeRect(
                  minX - 2,
                  minY - 2,
                  (maxX - minX || 0) + 4,
                  (maxY - minY || 0) + 4
                );
              }
              break;
            case "image":
              const imgPath = path as ImagePath;
              let img = imageCache.current[imgPath.src];
              if (!img) {
                img = new Image();
                img.src = imgPath.src;
                imageCache.current[imgPath.src] = img;
                img.onload = () => {
                  c.drawImage(
                    img,
                    imgPath.x,
                    imgPath.y,
                    imgPath.meta.width || 0,
                    imgPath.meta.height || 0
                  );
                  if (selectedPathIndices.includes(index)) {
                    c.strokeStyle = "#3b82f6";
                    c.setLineDash([6, 6]);
                    c.lineWidth = 2;
                    c.strokeRect(
                      imgPath.x - 2,
                      imgPath.y - 2,
                      (imgPath.meta.width || 0) + 4,
                      (imgPath.meta.height || 0) + 4
                    );
                  }
                };
              } else {
                c.drawImage(
                  img,
                  imgPath.x,
                  imgPath.y,
                  imgPath.meta.width || 0,
                  imgPath.meta.height || 0
                );
                if (selectedPathIndices.includes(index)) {
                  c.strokeStyle = "#3b82f6";
                  c.setLineDash([6, 6]);
                  c.lineWidth = 2;
                  c.strokeRect(
                    imgPath.x - 2,
                    imgPath.y - 2,
                    (imgPath.meta.width || 0) + 4,
                    (imgPath.meta.height || 0) + 4
                  );
                }
              }
              break;
            default:
              break;
          }
        });

      if (isSelecting) {
        c.strokeStyle = "rgba(59, 130, 246, 0.5)";
        c.setLineDash([4, 4]);
        c.lineWidth = 1;
        c.strokeRect(
          selectionStart.x,
          selectionStart.y,
          selectionEnd.x - selectionStart.x,
          selectionEnd.y - selectionStart.y
        );
      }

      c.restore(); // Restore the context to prevent the offset from affecting other operations
    }
  }, [
    paths,
    selectedPathIndices,
    panOffset,
    isSelecting,
    selectionStart,
    selectionEnd,
  ]);

  const exportToPNG = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "drawing.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUndo = useCallback(() => {
    setPaths((prevPaths) => {
      return prevPaths?.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        handleUndo();
      } else if (event.code === "Space") {
        event.preventDefault();
        setSelectedTool(HAND_TOOL);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        setShowRightSidebar((prev) => !prev);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "l") {
        event.preventDefault();
        setShowLeftSidebar((prev) => !prev);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        exportToPNG();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSelectedTool(historyToolRef.current);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      console.log("remove event listener");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleUndo, historyToolRef]);

  useEffect(() => {
    if (selectedTool !== HAND_TOOL) {
      historyToolRef.current = selectedTool;
    }
  }, [selectedTool]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.scale(dpr, dpr);
          draw(); // Redraw canvas on resize
        }
      }
    };

    handleResize(); // Initialize canvas size

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [draw, showLeftSidebar, showRightSidebar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      return () => {
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleClick, handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    draw();

    return () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, [paths, selectedPathIndices, draw, panOffset]);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    event.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    const dragIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (dragIndex !== index) {
      setPaths((prevPaths) => {
        const newPaths = [...prevPaths];
        const [movedPath] = newPaths.splice(dragIndex, 1);
        newPaths.splice(index, 0, movedPath);
        return newPaths.map((path, idx) => ({ ...path, zIndex: idx }));
      });
    }
    event.preventDefault();
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleNameChange = (index: number, newName: string) => {
    setPaths((prevPaths) => {
      const newPaths = [...prevPaths];
      newPaths[index].name = newName;
      return newPaths;
    });
  };

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
          >
            <Toolbar
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              onAddImage={handleAddImage}
            />
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
              <RdcLeftSidebar
                className={cn({
                  active: showLeftSidebar,
                  muted: !showLeftSidebar,
                })}
                width={20}
              />
            </button>
            <button
              className="button text"
              onClick={() => {
                setShowRightSidebar((prev) => !prev);
              }}
            >
              <RdcRightSidebar
                className={cn({
                  active: showRightSidebar,
                  muted: !showRightSidebar,
                })}
                width={20}
              />
            </button>
            <button className="button" onClick={exportToPNG}>
              Save
            </button>
          </div>
        </div>
        <div className="editor">
          <div
            className={cn("sidebar", {
              hidden: !showLeftSidebar,
            })}
            style={
              selectedTool === HAND_TOOL
                ? { opacity: 0.9, backdropFilter: "blur(10px)" }
                : {}
            }
          >
            <h4>Layer(s)</h4>
            {paths
              .slice()
              .sort((a, b) => b.zIndex - a.zIndex)
              ?.map((path, index) => (
                <div
                  key={path.zIndex}
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragOver={handleDragOver}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "move",
                  }}
                >
                  <p
                    style={{
                      display: "flex",
                      userSelect: "none",
                      flexGrow: 1,
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {path.type === "image" ? (
                      <RdcImage width={15} />
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          backgroundColor: path.meta.color || "black",
                          marginRight: 5,
                          borderRadius: 5,
                        }}
                      ></span>
                    )}
                    {path.name}
                    {/* <input
                      type="text"
                      value={path.name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      style={{ textTransform: "capitalize" }}
                    /> */}
                  </p>
                </div>
              ))}
          </div>
          <div
            className="content"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                cursor:
                  selectedTool === HAND_TOOL
                    ? "grab"
                    : selectedPathIndices.length > 0
                    ? "move"
                    : selectedTool === PEN_TOOL
                    ? "crosshair"
                    : "default",
              }}
            ></canvas>
          </div>
          <div
            className={cn("right sidebar", {
              hidden: !showRightSidebar,
            })}
            style={
              selectedTool === HAND_TOOL
                ? { opacity: 0.9, backdropFilter: "blur(10px)" }
                : {}
            }
          ></div>
        </div>
      </div>
    </div>
  );
}
