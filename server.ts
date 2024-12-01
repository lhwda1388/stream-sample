import express, { Request, Response } from "express";
import path from "path";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";

const app = express();

app.get("/", (_req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/videos", async (req: Request, res: Response): Promise<void> => {
  const range = req.headers.range;
  if (!range) {
    res.status(400).send("Range 헤더가 필요합니다");
    return;
  }

  console.log("video start");

  // Range 헤더에서 시작 위치 추출
  const start = Number(range.replace(/\D/g, ""));
  const chunkSize = 1024 * 1024; // 1MB 청크 크기
  const end = start + chunkSize;

  const videoPath =
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const headResponse = await fetch(videoPath, { method: "HEAD" });
  const videoSize = Number(headResponse.headers.get("content-length"));

  const response = await fetch(videoPath, {
    headers: {
      Range: `bytes=${start}-${end}`,
    },
  });

  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  };
  if (!response.body) {
    res.status(500).send("스트림을 가져올 수 없습니다");
    return;
  }

  res.writeHead(206, headers as any);

  const reader = response.body!.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    },
  }) as unknown as ReadableStream;

  console.log("video end");
  const nodeStream = Readable.fromWeb(stream);
  nodeStream.pipe(res);
});

app.listen(3000, () => {
  console.log("서버가 3000번 포트에서 실행 중입니다.");
});
