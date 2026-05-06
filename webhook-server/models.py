from dataclasses import dataclass, field, asdict


@dataclass
class HistoryEntry:
    sender_id: str
    sender_name: str
    text: str
    ts: str


@dataclass
class StandardContextPayload:
    platform: str
    routing_key: str = ""
    path: str = "/message"
    chat_id: str = ""
    chat_type: str = "channel"
    channel_name: str = ""
    message_id: str = ""
    sender_id: str = ""
    sender_name: str = ""
    sender_username: str = ""
    text: str = ""
    mentions: list = field(default_factory=list)
    history: list = field(default_factory=list)
    ts: str = ""
    raw_event: dict = field(default_factory=dict)

    def to_json(self) -> str:
        import json

        data = asdict(self)
        return json.dumps(data, default=str)

    @classmethod
    def from_json(cls, raw: str) -> "StandardContextPayload":
        import json

        data = json.loads(raw)
        return cls(**data)
