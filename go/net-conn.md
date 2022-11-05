---
layout: "../src/layouts/BlogPost.astro"
title: "Reading from Go's net Conn"
pubDate: "Nov 04 2022"
---

I was working through [Codecrafter's](https://codecrafters.io) "Build your own Redis in Go" tutorial. While it was a very interesting tutorial, I got hung up when trying to read from the connection and the solution for that particular step was wrong. Here's a barebones Go TCP listener based on the solution, ignoring a few errors:

```go
package main

import (
    "fmt"
    "net"
    "os"
)

func main() {
    l, _ := net.Listen("tcp", "0.0.0.0:6379")

    conn, _ := l.Accept()

    defer conn.Close()

    for {
        if _, err := conn.Read([]byte{}); err != nil {
            fmt.Println("Error reading from client: ", err.Error())
            continue
        }

        conn.Write([]byte("+PONG\r\n"))
    }
}
```

The idea was to respond with `PONG` (in [RESP](https://redis.io/docs/reference/protocol-spec/#resp-simple-strings)) if we received something from the client. However, the tutorial assumed `conn.Read(...)` blocked until it received something, but that wasn't the case. Instead, we'd send a bunch of `+PONG\r\n`s.

To solve this I tried getting the `n` value from `conn.Read(...)`, which I assumed is the number of bytes received. If we receive no bytes we continue.

```go
func main() {
    ...

    for {
        n, err := conn.Read([]byte{})
        if err != nil {
            fmt.Println("Error reading from client: ", err.Error())
            continue
        }

        if n == 0 {
            continue
        }


        conn.Write([]byte("+PONG\r\n"))
    }
}
```

That didn't work... When reading the [Go documentation](https://pkg.go.dev/net@go1.18.8#Buffers.Read) about it, I wasn't sure if my assumption was correct since it didn't even mention what `n` was supposed to be.

Digging through Go's source code revealed [this](https://cs.opensource.google/go/go/+/refs/tags/go1.18.8:src/internal/poll/fd_unix.go;l=149-153;drc=90b40c0496440fbd57538eb4ba303164ed923d93;bpv=1;bpt=1):

```go
// Read implements io.Reader.
func (fd *FD) Read(p []byte) (int, error) {
    ...
    if len(p) == 0 {
        // If the caller wanted a zero byte read, return immediately
        // without trying (but after acquiring the readLock).
        // Otherwise syscall.Read returns 0, nil which looks like
        // io.EOF.
        // TODO(bradfitz): make it wait for readability? (Issue 15735)
        return 0, nil
    }
    ...
}
```

Interestingly enough, the tutorial's assumption was left as some TODO and the [issue mentioned](https://github.com/golang/go/issues/15735) has been in active discussion for the past 6 years.

Anyways, let's not pass in an empty byte array then:

```go
func main() {
    ...

    d := make([]byte, 1024)
    for {
        n, err := conn.Read(d)
        if err != nil {
            fmt.Println("Error reading from client: ", err.Error())
            continue
        }

        if n == 0 {
            continue
        }


        conn.Write([]byte("+PONG\r\n"))
    }
}
```

Sure enough, that did the trick since `n` is the number of bytes _read_ and not received.

While it would be nice for it to block for readability, I think having better documentation would've been nice.
